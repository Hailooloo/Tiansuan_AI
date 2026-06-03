App({
  onLaunch() {
    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      currentPerson: null,
      vipStatus: false,
      apiBaseUrl: 'https://your-api-domain.com/api'
    };

    // 检查登录状态
    this.checkLogin();
  },

  onShow() {},

  onHide() {},

  checkLogin() {
    const token = wx.getStorageSync('access_token');
    if (token) {
      this.globalData.token = token;
    }
  },

  globalData: {
    token: null,
    userInfo: null,
    currentPerson: null,
    vipStatus: false,
    apiBaseUrl: 'https://your-api-domain.com/api'
  }
});
