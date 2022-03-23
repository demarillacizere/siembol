import { ConfigStoreState } from '@app/model/store-state';
import { cloneDeep } from 'lodash';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Config, Release, FileHistory } from '../../model';
import { TestCaseMap } from '@app/model/test-case';
import { TestCaseWrapper, TestCaseResult } from '../../model/test-case';
import { AdminConfig, CheckboxEvent, ConfigManagerRow, EnabledCheckboxFilters } from '@app/model/config-model';
import { UiMetadata } from '@app/model/ui-metadata-map';

export class ConfigStoreStateBuilder {
  private state: ConfigStoreState;

  constructor(oldState: ConfigStoreState) {
    this.state = cloneDeep(oldState);
  }

  configs(configs: Config[]) {
    this.state.configs = configs;
    return this;
  }

  release(release: Release) {
    this.state.release = release;
    return this;
  }

  adminConfig(config: AdminConfig) {
    this.state.adminConfig = config;
    return this;
  }

  initialRelease(release: Release) {
    this.state.initialRelease = cloneDeep(release);
    return this;
  }

  releaseHistory(releaseHistory: FileHistory[]) {
    this.state.releaseHistory = releaseHistory;
    return this;
  }

  detectOutdatedConfigs(): ConfigStoreStateBuilder {
    this.state.configs.forEach(config => {
      const matchingConfig = this.state.release.configs.find(r => !r.isNew && r.name === config.name);
      if (matchingConfig) {
        config.isReleased = true;
        matchingConfig.isReleased = true;
        if (matchingConfig.version !== config.version) {
          config.versionFlag = config.version;
          matchingConfig.versionFlag = config.version;
        } else {
          config.versionFlag = -1;
          matchingConfig.versionFlag = -1;
        }
      } else {
        config.isReleased = false;
        config.versionFlag = -1;
      }
    });
    return this;
  }

  updateTestCasesInConfigs() {
    this.state.configs.forEach(config => {
      config.testCases = this.state.testCaseMap[config.name] || [];
    });
    return this;
  }

  resetEditedTestCase() {
    this.state.editedTestCase = null;
    return this;
  }

  editedTestCase(testCase: TestCaseWrapper) {
    this.state.editedTestCase = testCase;
    return this;
  }

  editedConfigTestCases(testCases: TestCaseWrapper[]) {
    if (this.state.editedConfig) {
      this.state.editedConfig.testCases = testCases;
    }
    return this;
  }

  editedTestCaseResult(testCaseResult: TestCaseResult) {
    if (this.state.editedTestCase) {
      this.state.editedTestCase.testCaseResult = testCaseResult;
    }
    return this;
  }

  reorderConfigsByRelease(): ConfigStoreStateBuilder {
    let pos = 0;
    this.state.sortedConfigs = cloneDeep(this.state.configs);
    for (const r of this.state.release.configs) {
      for (let i = pos; i < this.state.sortedConfigs.length; ++i) {
        if (this.state.sortedConfigs[i].name === r.name) {
          const tmp = this.state.sortedConfigs[pos];
          this.state.sortedConfigs[pos] = this.state.sortedConfigs[i];
          this.state.sortedConfigs[i] = tmp;
        }
      }
      ++pos;
    }

    return this;
  }

  searchTerm(searchTerm: string): ConfigStoreStateBuilder {
    this.state.searchTerm = searchTerm === null || searchTerm === undefined ? '' : searchTerm;
    return this;
  }

  filterMyConfigs(filterMyConfigs: boolean): ConfigStoreStateBuilder {
    this.state.filterMyConfigs = filterMyConfigs;
    return this;
  }

  filterUnreleased(filterUnreleased: boolean): ConfigStoreStateBuilder {
    this.state.filterUnreleased = filterUnreleased;
    return this;
  }

  filterUpgradable(filterUpgradable: boolean): ConfigStoreStateBuilder {
    this.state.filterUpgradable = filterUpgradable;
    return this;
  }

  updateCheckboxFilters(event: CheckboxEvent): ConfigStoreStateBuilder {
    if (this.state.enabledCheckboxFilters[event.title] === undefined) {
      this.state.enabledCheckboxFilters[event.title] = {};
    }
    if (event.checked) {
      this.state.enabledCheckboxFilters[event.title][event.name] = true;
    } else {
      delete this.state.enabledCheckboxFilters[event.title][event.name];
    }
    return this;
  }

  addConfigToRelease(name: string) {
    const configToAdd = cloneDeep(this.state.configs.find(c => c.name === name));
    this.state.release.configs.push(configToAdd);
    return this;
  }

  removeConfigFromRelease(name: string) {
    this.state.release.configs = this.state.release.configs.filter(
      x => x.name !== name
    );
    return this;
  }

  moveConfigInRelease(configName: string, filteredCurrentIndex: number) {
    const previousIndex = this.state.release.configs.findIndex(
      e => e.name === configName
    );
    const currentIndex = this.state.release.configs.findIndex(
      e => e.name === this.state.release.configs[filteredCurrentIndex]?.name
    );
    if (currentIndex === -1) {
      return this;
    }
    moveItemInArray(this.state.release.configs, previousIndex, currentIndex);
    return this;
  }

  upgradeConfigInRelease(configName: string) {
    const originalReleaseIndex = this.state.release.configs.findIndex(d => d.name === configName);
    const configToUpgrade = this.state.configs.find(c => c.name === configName);
    this.state.release.configs[originalReleaseIndex] = cloneDeep(configToUpgrade);
    return this;
  }

  releaseSubmitInFlight(releaseSubmitInFlight: boolean) {
    this.state.releaseSubmitInFlight = releaseSubmitInFlight;
    return this;
  }

  editedConfig(editedConfig: Config) {
    this.state.editedConfig = editedConfig;
    return this;
  }

  editedConfigByName(configName: string) {
    this.state.editedConfig = this.state.configs.find(x => x.name === configName);
    return this;
  }

  testCaseMap(testCaseMap: TestCaseMap) {
    this.state.testCaseMap = testCaseMap;
    return this;
  }

  pastedConfig(config: any) {
    this.state.pastedConfig = config;
    return this;
  }

  build(): ConfigStoreState {
    return this.state;
  }

  incrementChangesInRelease() {
    this.state.countChangesInRelease += 1;
    return this;
  }

  resetChangesInRelease() {
    this.state.countChangesInRelease = 0;
    return this;
  }

  computeConfigManagerRowData(user: string, uiMetadata: UiMetadata) {
    this.computeIsExternalFilterPresent();
    this.state.configManagerRowData = this.state.sortedConfigs.map(
      (config: Config) => this.getRowFromConfig(config, this.state.release, user, uiMetadata)
    );
    return this;
  }

  private computeIsExternalFilterPresent() {
    this.state.isExternalFilterPresent = this.state.filterMyConfigs 
      || this.state.filterUnreleased 
      || this.state.filterUpgradable
      || this.isGroupCheckboxFilterPresent(this.state.enabledCheckboxFilters);
  }

  private doesExternalFilterPass(node: ConfigManagerRow, user: string, uiMetadata: UiMetadata): boolean {
    if (this.state.filterMyConfigs && node.author !== user) {
      return false;
    }
    if (this.state.filterUnreleased && node.releasedVersion !== 0) {
      return false;
    }
    if (this.state.filterUpgradable && (node.releasedVersion === node.version || node.releasedVersion === 0)) {
      return false;
    } 
    return this.doGroupCheckboxesPass(node, uiMetadata);
  }

  private isGroupCheckboxFilterPresent(filters: EnabledCheckboxFilters): boolean {
    for (const checkboxGroup of Object.values(filters)) {
      for (const checked of Object.values(checkboxGroup)) {
        if (checked) {
          return true;
        }
      }
    }
    return false;
  }

  private doGroupCheckboxesPass(node: ConfigManagerRow, uiMetadata: UiMetadata): boolean {
    for (const [groupTitle, checkboxes] of Object.entries(this.state.enabledCheckboxFilters)) {
      if (!this.doesGroupCheckboxFilterPass(groupTitle, checkboxes, node, uiMetadata)) {
        return false;
      }
    }
    return true;
  }

  private doesGroupCheckboxFilterPass(
    groupTitle: string, 
    checkboxes: Record<string, boolean>, 
    node: ConfigManagerRow,
    uiMetadata: UiMetadata
  ): boolean {
    for (const [checkBoxName, checked] of Object.entries(checkboxes)) {
      if (checked) {
        if (!this.doesSingleCheckboxFilterPass(groupTitle, checkBoxName, node, uiMetadata)) {
          return false;
        }
      }
    }  
    return true;
  }
  

  private doesSingleCheckboxFilterPass(
    groupTitle: string, 
    checkboxName: string, 
    node: ConfigManagerRow,
    uiMetadata: UiMetadata
  ): boolean {
    const filter = uiMetadata.checkboxes[groupTitle][checkboxName];
    for (const value of filter.values) {
      if (node.labels.find(l => l.toLowerCase() === filter.label + ":" + value)){
        return true;
      }
    }
    return false;
  }

  private getRowFromConfig(config: Config, release: Release, user: string, uiMetadata: UiMetadata): ConfigManagerRow {
    const releaseConfig = release.configs.find(x => x.name === config.name);
    const releaseVersion = releaseConfig? releaseConfig.version : 0;
    const row = {
      author: config.author, 
      version: config.version, 
      config_name: config.name, 
      releasedVersion:  releaseVersion,
      configHistory: config.fileHistory,
      labels: config.tags,
      testCasesCount: config.testCases.length,
      isFiltered: true,
    };
    if (this.state.isExternalFilterPresent) {
      row.isFiltered = this.doesExternalFilterPass(row, user, uiMetadata);
    }
    return row;
  }
}
