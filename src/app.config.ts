export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/ranking/index',
    'pages/profile/index',
    'pages/training/index',
    'pages/result/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFF8F0',
    navigationBarTitleText: '舒尔特方格',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FFF8F0'
  },
  tabBar: {
    color: '#777777',
    selectedColor: '#6B5D7A',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/images/tabbar/transparent.png',
        selectedIconPath: 'assets/images/tabbar/transparent.png'
      },
      {
        pagePath: 'pages/ranking/index',
        text: '排行榜',
        iconPath: 'assets/images/tabbar/transparent.png',
        selectedIconPath: 'assets/images/tabbar/transparent.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '个人中心',
        iconPath: 'assets/images/tabbar/transparent.png',
        selectedIconPath: 'assets/images/tabbar/transparent.png'
      }
    ]
  }
})
