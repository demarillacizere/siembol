package uk.co.gresearch.siembol.enrichments.storm;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;

import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.storm.task.OutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichBolt;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Tuple;
import org.apache.storm.tuple.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import uk.co.gresearch.siembol.common.filesystem.HdfsFileSystemFactory;
import uk.co.gresearch.siembol.common.filesystem.SiembolFileSystem;
import uk.co.gresearch.siembol.common.filesystem.SiembolFileSystemFactory;
import uk.co.gresearch.siembol.common.model.StormEnrichmentAttributesDto;
import uk.co.gresearch.siembol.common.model.ZookeeperAttributesDto;
import uk.co.gresearch.siembol.common.zookeper.ZookeeperConnectorFactory;
import uk.co.gresearch.siembol.common.zookeper.ZookeeperConnector;
import uk.co.gresearch.siembol.enrichments.common.EnrichmentCommand;
import uk.co.gresearch.siembol.enrichments.storm.common.*;
import uk.co.gresearch.siembol.enrichments.table.EnrichmentMemoryTable;
import uk.co.gresearch.siembol.enrichments.table.EnrichmentTable;

import java.io.InputStream;
import java.lang.invoke.MethodHandles;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

public class MemoryTableEnrichmentBolt extends BaseRichBolt {
    private static final Logger LOG = LoggerFactory.getLogger(MethodHandles.lookup().lookupClass());
    private static final ObjectReader TABLES_UPDATE_READER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .readerFor(TablesUpdate.class);

    private static final String TABLES_INIT_START = "Initialisation of enrichment tables started";
    private static final String TABLES_INIT_COMPLETED = "Initialisation of enrichment tables completed";
    private static final String TABLES_UPDATES_START = "Updating enrichment tables";
    private static final String TABLES_UPDATES_COMPLETED = "Updating enrichment tables completed";
    private static final String TABLES_UPDATE_MESSAGE_FORMAT = "Updating enrichment tables: %s";
    private static final String TABLES_UPDATE_EXCEPTION_FORMAT = "Exception during update of enrichment tables: {}";
    private static final String TABLE_INIT_START = "Trying to initialise enrichment table: {} from the file: {}";
    private static final String TABLE_INIT_COMPLETED = "Initialisation of enrichment table: {} completed";
    private static final String TABLES_UPDATE_EMPTY_TABLES = "No enrichment tables provided";
    private static final String INIT_EXCEPTION_MSG_FORMAT = "Exception during loading memory table: %s";
    private static final String INVALID_TYPE_IN_TUPLES = "Invalid type in tuple provided";

    private final AtomicReference<Map<String, EnrichmentTable>> enrichmentTables = new AtomicReference<>();
    private final ZookeeperAttributesDto zookeperAttributes;
    private final ZookeeperConnectorFactory zookeeperConnectorFactory;
    private final SiembolFileSystemFactory fileSystemFactory;

    private OutputCollector collector;
    private ZookeeperConnector zookeeperConnector;

    MemoryTableEnrichmentBolt(StormEnrichmentAttributesDto attributes,
                              ZookeeperConnectorFactory zookeeperConnectorFactory,
                              SiembolFileSystemFactory fileSystemFactory) {
        this.zookeperAttributes = attributes.getEnrichingTablesAttributes();
        this.zookeeperConnectorFactory = zookeeperConnectorFactory;
        this.fileSystemFactory = fileSystemFactory;
    }

    public MemoryTableEnrichmentBolt(StormEnrichmentAttributesDto attributes) {
        this(attributes,
                new ZookeeperConnectorFactory() {},
                new HdfsFileSystemFactory(attributes.getEnrichingTablesHdfsUri()));
    }

    @Override
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.collector = outputCollector;

        try {
            LOG.info(TABLES_INIT_START);
            zookeeperConnector = zookeeperConnectorFactory.createZookeeperConnector(zookeperAttributes);

            updateTables();
            if (enrichmentTables.get() == null) {
                LOG.error(TABLES_UPDATE_EMPTY_TABLES);
                throw new IllegalStateException(TABLES_UPDATE_EMPTY_TABLES);
            }

            zookeeperConnector.addCacheListener(this::updateTables);
            LOG.info(TABLES_INIT_COMPLETED);
        } catch (Exception e) {
            String msg = String.format(INIT_EXCEPTION_MSG_FORMAT, ExceptionUtils.getStackTrace(e));
            LOG.error(msg);
            throw new IllegalStateException(msg);
        }
    }

    private void updateTables() {
        try {
            LOG.info(TABLES_UPDATES_START);

            String tablesUpdateStr = zookeeperConnector.getData();
            LOG.info(String.format(TABLES_UPDATE_MESSAGE_FORMAT, tablesUpdateStr));
            Map<String, EnrichmentTable> tables = new HashMap<>();
            TablesUpdate tablesUpdate = TABLES_UPDATE_READER.readValue(tablesUpdateStr);
            try (SiembolFileSystem fs = fileSystemFactory.create()) {
                for (HdfsTable table :  tablesUpdate.getHdfsTables()) {
                    LOG.info(TABLE_INIT_START, table.getName(), table.getPath());
                    try (InputStream is = fs.openInputStream(table.getPath())) {
                        tables.put(table.getName(), EnrichmentMemoryTable.fromJsonStream(is));
                    }
                    LOG.info(TABLE_INIT_COMPLETED, table.getName());
                }
            }
            enrichmentTables.set(tables);
            LOG.info(TABLES_UPDATES_COMPLETED);
        } catch (Exception e) {
            LOG.error(TABLES_UPDATE_EXCEPTION_FORMAT, ExceptionUtils.getStackTrace(e));
            return;
        }
    }

    @Override
    public void execute(Tuple tuple) {
        String event = tuple.getStringByField(EnrichmentTuples.EVENT.toString());

        Object commandsObj = tuple.getValueByField(EnrichmentTuples.COMMANDS.toString());
        if (!(commandsObj instanceof EnrichmentCommands)) {
            LOG.error(INVALID_TYPE_IN_TUPLES);
            throw new IllegalArgumentException(INVALID_TYPE_IN_TUPLES);
        }
        EnrichmentCommands commands = (EnrichmentCommands)commandsObj;

        Object exceptionsObj = tuple.getValueByField(EnrichmentTuples.EXCEPTIONS.toString());
        if (!(exceptionsObj instanceof EnrichmentExceptions)) {
            LOG.error(INVALID_TYPE_IN_TUPLES);
            throw new IllegalArgumentException(INVALID_TYPE_IN_TUPLES);
        }
        EnrichmentExceptions exceptions = (EnrichmentExceptions)exceptionsObj;

        EnrichmentPairs enrichments = new EnrichmentPairs();
        Map<String, EnrichmentTable> currentTables = enrichmentTables.get();
        for (EnrichmentCommand command : commands) {
            EnrichmentTable table = currentTables.get(command.getTableName());
            if (table == null) {
                continue;
            }

            Optional<List<Pair<String, String>>> result = table.getValues(command);
            if (result.isPresent()) {
                enrichments.addAll(result.get());
            }

        }
        collector.emit(tuple, new Values(event, enrichments, exceptions));
        collector.ack(tuple);
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields(EnrichmentTuples.EVENT.toString(),
                EnrichmentTuples.ENRICHMENTS.toString(),
                EnrichmentTuples.EXCEPTIONS.toString()));
    }
}
