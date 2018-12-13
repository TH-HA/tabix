import { observable, action } from 'mobx';
import { UIStore, BaseRootStore } from '@vzh/mobx-stores';
import { Connection } from 'services';
import AppStore from './AppStore';
import SignInStore from './SignInStore';
import DashboardStore from './DashboardStore';
import DashboardUIStore from './DashboardUIStore';
import SqlHistoryStore from './SqlHistoryStore';
import TreeStore from './TreeStore';
import TabsStore from './TabsStore';

export default class RootStore extends BaseRootStore {
  @observable
  appStore: AppStore;

  @observable
  signInStore: SignInStore;

  @observable
  treeStore: TreeStore;

  @observable
  tabsStore: TabsStore;

  @observable
  dashboardStore: DashboardStore;

  @observable
  sqlHistoryStore: SqlHistoryStore;

  constructor() {
    super();
    this.appStore = new AppStore(this, new UIStore(this));
    this.signInStore = new SignInStore(this, new UIStore(this));
    const dashboardUIStore = new DashboardUIStore(this);
    this.treeStore = new TreeStore(this, dashboardUIStore);
    this.tabsStore = new TabsStore(this, dashboardUIStore);
    this.dashboardStore = new DashboardStore(this, dashboardUIStore);
    this.sqlHistoryStore = new SqlHistoryStore(this, new UIStore(this));
    this.initialize();
  }

  // refactor: temporary for HMR
  @action
  updateChildStores(rootStore: RootStore, connection?: Connection) {
    this.dispose();
    this.appStore = rootStore.appStore;
    this.signInStore = rootStore.signInStore;
    this.treeStore = rootStore.treeStore;
    this.tabsStore = rootStore.tabsStore;
    this.dashboardStore = rootStore.dashboardStore;
    this.sqlHistoryStore = rootStore.sqlHistoryStore;
    connection && this.appStore.initApi(connection);
  }
}
