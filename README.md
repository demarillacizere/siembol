![Siembol](logo.svg)

[![Black Hat Arsenal](https://raw.githubusercontent.com/toolswatch/badges/54ad78bc63b24ce445e8241f179fe1ddeecf8eef/arsenal/usa/2021.svg)](https://www.blackhat.com/us-21/arsenal/schedule/index.html#siembol-an-open-source-real-time-siem-tool-based-on-big-data-technologies-24038) 

Siembol provides a scalable, advanced security analytics framework based on open-source big data technologies. Siembol normalizes, enriches, and alerts on data from various sources, which allows security teams to respond to attacks before they become incidents.

- [Introduction](/docs/introduction/introduction.md)
    - [How to try Siembol](/docs/introduction/how-tos/quickstart.md)
    - [How to contribute](/docs/introduction/how-tos/how_to_contribute.md)
- [Siembol UI](/docs/siembol_ui/siembol_ui.md)
    - [Adding a new configuration](/docs/siembol_ui/how-tos/how_to_add_new_config_in_siembol_ui.md)
    - [Submitting configurations](/docs/siembol_ui/how-tos/how_to_submit_config_in_siembol_ui.md)
    - [Importing a sigma rule](/docs/siembol_ui/how-tos/how_to_import_sigma_rules.md)
    - [Deploying configurations](/docs/siembol_ui/how-tos/how_to_deploy_configurations_in_siembol_ui.md)
    - [Testing configurations](/docs/siembol_ui/how-tos/how_to_test_config_in_siembol_ui.md)
    - [Testing deployments](/docs/siembol_ui/how-tos/how_to_test_deployment_in_siembol_ui.md)  
    - [Adding links to the homepage](/docs/siembol_ui/how-tos/how_to_add_links_to_siembol_ui_home_page.md)
    - [Setting up OAUTH2 OIDC](/docs/siembol_ui/how-tos/how_to_setup_oauth2_oidc_in_siembol_ui.md)
    - [Modifying the layout](/docs/siembol_ui/how-tos/how_to_modify_ui_layout.md)
    - [Managing applications](/docs/siembol_ui/how-tos/how_to_manage_applications.md)
- Siembol services    
    - [Setting up a service in the config editor rest](/docs/services/how-tos/how_to_set_up_service_in_config_editor_rest.md)
    - [Alerting service](/docs/services/siembol_alerting_services.md)
    - [Parsing service](/docs/services/siembol_parsing_services.md)
        - [How to setup NetFlow v9 parsing](/docs/services/how-tos/how_to_setup_netflow_v9_parsing.md)
    - [Enrichment service](/docs/services/siembol_enrichment_service.md)
        - [Setting up an enrichment table](/docs/services/how-tos/how_to_set_up_enrichment_table.md)
    - [Response service](/docs/services/siembol_response_service.md)
        - [Writing a response plugin](/docs/services/how-tos/how_to_write_response_plugin.md)
- [Siembol deployment](/docs/deployment/deployment.md)
    - [Setting up ZooKeeper nodes](/docs/deployment/how-tos/how_to_set_up_zookeeper_nodes.md)
    - [Setting up a GitHub webhook](/docs/deployment/how-tos/how_to_setup_github_webhook.md)
    - [Tuning the performance of Storm topologies](/docs/deployment/how-tos/how_to_tune_performance_of_storm_topologies.md)
    - [Setting up Kerberos for external dependencies](/docs/deployment/how-tos/how_to_set_up_kerberos_for_external_dependencies.md)
