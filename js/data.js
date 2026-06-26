/**
 * 人生已完成清单 - 数据模块
 * 包含内置清单和清单大全模板
 */

// 内置清单（默认在用户的人生进度中）
const DEFAULT_LISTS = [
  {
    id: 'travel',
    emoji: '🌍',
    title: '环游世界',
    description: '探索这个美丽星球的每一个角落',
    color: '#007AFF',
    category: '旅行',
    tasks: [
      { id: 'aurora', text: '看一次极光', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'paris', text: '去一次巴黎', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'taishan', text: '攀登一次泰山', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'balloon', text: '坐一次热气球', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'diving', text: '潜水一次', completed: false, completedDate: '', note: '', priority: 'medium' }
    ]
  },
  {
    id: 'skills',
    emoji: '🎯',
    title: '技能解锁',
    description: '掌握那些一直想学的技能',
    color: '#FF9500',
    category: '成长',
    tasks: [
      { id: 'guitar', text: '学会弹吉他', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'cooking', text: '做一顿完整的晚餐', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'swimming', text: '学会游泳', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'photography', text: '拍出满意的照片', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'coding', text: '写一个小程序', completed: false, completedDate: '', note: '', priority: 'medium' }
    ]
  },
  {
    id: 'life',
    emoji: '❤️',
    title: '人生体验',
    description: '那些值得铭记一生的时刻',
    color: '#FF2D55',
    category: '体验',
    tasks: [
      { id: 'sunrise', text: '看一次日出', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'camping', text: '露营一次', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'volunteer', text: '做一次志愿者', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'letter', text: '给未来的自己写封信', completed: false, completedDate: '', note: '', priority: 'medium' },
      { id: 'reunion', text: '和老朋友重聚', completed: false, completedDate: '', note: '', priority: 'medium' }
    ]
  }
];

// 清单大全模板
const TEMPLATE_LIBRARY = [
  {
    id: 'china_cities',
    emoji: '🗺️',
    title: '中国城市打卡',
    description: '走过祖国的大好河山',
    color: '#34C759',
    category: '旅行',
    icon: '🏙️',
    taskCount: 34,
    tasks: [
      '打卡北京天安门', '漫步上海外滩', '游览西安兵马俑', '观赏杭州西湖', '探索成都宽窄巷子',
      '登临武汉黄鹤楼', '感受重庆洪崖洞', '游览南京中山陵', '漫步厦门鼓浪屿', '登临青岛栈桥',
      '观赏桂林山水', '游览苏州园林', '探索深圳华强北', '感受广州早茶文化', '游览天津五大道',
      '登临泰山看日出', '游览黄山奇松怪石', '感受长沙橘子洲头', '游览郑州少林寺', '探索大连星海广场',
      '漫步哈尔滨中央大街', '游览沈阳故宫', '观赏长春净月潭', '探索石家庄赵州桥', '游览太原晋祠',
      '感受兰州牛肉面', '游览西宁塔尔寺', '探索银川西夏王陵', '游览乌鲁木齐大巴扎', '感受拉萨布达拉宫',
      '游览昆明石林', '感受贵阳黄果树瀑布', '探索南宁青秀山', '游览海口骑楼老街'
    ]
  },
  {
    id: 'douban_top250',
    emoji: '🎬',
    title: '豆瓣 TOP250 电影',
    description: '一生中必看的经典电影',
    color: '#5856D6',
    category: '影视',
    icon: '🎭',
    taskCount: 50,
    tasks: [
      '肖申克的救赎', '霸王别姬', '阿甘正传', '泰坦尼克号', '千与千寻',
      '美丽人生', '辛德勒的名单', '星际穿越', '盗梦空间', '楚门的世界',
      '忠犬八公的故事', '三傻大闹宝莱坞', '海上钢琴师', '放牛班的春天', '大话西游之大圣娶亲',
      '机器人总动员', '无间道', '疯狂动物城', '教父', '当幸福来敲门',
      '怦然心动', '触不可及', '蝙蝠侠：黑暗骑士', '活着', '末代皇帝',
      '寻梦环游记', '乱世佳人', '哈利·波特与魔法石', '指环王：王者无敌', '新龙门客栈',
      '素媛', '飞屋环游记', '让子弹飞', '摔跤吧！爸爸', '少年派的奇幻漂流',
      '十二怒汉', '哈尔的移动城堡', '鬼子来了', '猫鼠游戏', '天空之城',
      '钢琴家', '大话西游之月光宝盒', '指环王：护戒使者', '何以为家', '黑客帝国',
      '窃听风暴', '闻香识女人', '绿皮书', '海蒂和爷爷', '辩护人'
    ]
  },
  {
    id: 'couple_100',
    emoji: '💑',
    title: '情侣 100 件事',
    description: '和爱的人一起完成的小事',
    color: '#FF2D55',
    category: '情感',
    icon: '💕',
    taskCount: 100,
    tasks: [
      '一起看日出', '一起做饭', '一起旅行', '一起看电影', '一起逛街',
      '一起打游戏', '一起养宠物', '一起看海', '一起爬山', '一起拍照',
      '一起听音乐会', '一起做饭给彼此', '一起过情人节', '一起看烟花', '一起跨年',
      '一起去游乐园', '一起泡温泉', '一起做蛋糕', '一起种植物', '一起放风筝',
      '一起骑自行车', '一起滑冰', '一起滑雪', '一起潜水', '一起坐摩天轮',
      '一起写情书', '一起看日落', '一起去海边捡贝壳', '一起做陶艺', '一起画画',
      '一起学跳舞', '一起健身', '一起跑步', '一起瑜伽', '一起露营',
      '一起烧烤', '一起去图书馆', '一起逛博物馆', '一起看展览', '一起去动物园',
      '一起拼图', '一起玩乐高', '一起唱 K', '一起学乐器', '一起煮火锅',
      '一起吃早餐', '一起午睡', '一起逛超市', '一起整理房间', '一起布置家',
      '一起看星星', '一起许愿', '一起淋雨', '一起堆雪人', '一起放风筝',
      '一起做志愿者', '一起献血', '一起参加马拉松', '一起看演唱会', '一起去音乐节',
      '一起学摄影', '一起做手工', '一起写手账', '一起记账', '一起规划未来',
      '一起见家长', '一起养孩子', '一起买房', '一起装修', '一起搬家',
      '一起过生日', '一起过圣诞节', '一起过春节', '一起过纪念日', '一起过七夕',
      '一起穿情侣装', '一起戴情侣戒', '一起用情侣头像', '一起取昵称', '一起写愿望清单',
      '一起存钱', '一起理财', '一起创业', '一起学习', '一起考试',
      '互相剪指甲', '互相吹头发', '互相按摩', '互相准备惊喜', '互相写信',
      '一起看恐怖片', '一起玩密室逃脱', '一起玩剧本杀', '一起去鬼屋', '一起探险',
      '一起去寺庙祈福', '一起放孔明灯', '一起写给对方未来的信', '一起慢慢变老'
    ]
  },
  {
    id: 'world_food',
    emoji: '🍜',
    title: '人生必尝美食',
    description: '用味蕾丈量这个世界',
    color: '#FF9500',
    category: '美食',
    icon: '🍱',
    taskCount: 50,
    tasks: [
      '北京烤鸭', '四川火锅', '广东早茶', '兰州拉面', '西安肉夹馍',
      '上海小笼包', '重庆小面', '武汉热干面', '长沙臭豆腐', '南京盐水鸭',
      '杭州西湖醋鱼', '苏州松鼠鳜鱼', '福州佛跳墙', '厦门沙茶面', '青岛啤酒',
      '广西螺蛳粉', '云南过桥米线', '贵州酸汤鱼', '新疆大盘鸡', '西藏酥油茶',
      '日本寿司', '韩国烤肉', '泰国冬阴功', '越南河粉', '印度咖喱',
      '意大利披萨', '法国牛排', '西班牙海鲜饭', '德国猪脚', '希腊沙拉',
      '墨西哥卷饼', '巴西烤肉', '阿根廷烤肉', '美国汉堡', '英国炸鱼薯条',
      '土耳其烤肉', '摩洛哥塔吉锅', '黎巴嫩鹰嘴豆泥', '埃塞俄比亚英吉拉', '俄罗斯罗宋汤',
      '马卡龙', '提拉米苏', '舒芙蕾', '黑森林蛋糕', '芝士蛋糕',
      '抹茶甜品', '芒果糯米饭', '椰子冻', '珍珠奶茶', '手冲咖啡'
    ]
  },
  {
    id: 'books_100',
    emoji: '📚',
    title: '100本高质量必读书单',
    description: '在书中遇见更好的自己',
    color: '#AF52DE',
    category: '阅读',
    icon: '📖',
    taskCount: 100,
    tasks: [
      '《活着》余华', '《百年孤独》马尔克斯', '《1984》奥威尔', '《小王子》圣埃克苏佩里', '《围城》钱钟书',
      '《追风筝的人》卡勒德', '《白夜行》东野圭吾', '《三体》刘慈欣', '《红楼梦》曹雪芹', '《挪威的森林》村上春树',
      '《人类简史》尤瓦尔', '《明朝那些事儿》当年明月', '《平凡的世界》路遥', '《解忧杂货店》东野圭吾', '《嫌疑人X的献身》东野圭吾',
      '《傲慢与偏见》简·奥斯汀', '《了不起的盖茨比》菲茨杰拉德', '《老人与海》海明威', '《麦田里的守望者》塞林格', '《动物庄园》奥威尔',
      '《局外人》加缪', '《鼠疫》加缪', '《月亮与六便士》毛姆', '《面纱》毛姆', '《刀锋》毛姆',
      '《霍乱时期的爱情》马尔克斯', '《情人》杜拉斯', '《局外人》加缪', '《悉达多》黑塞', '《荒原狼》黑塞',
      '《杀死一只知更鸟》哈珀·李', '《飘》玛格丽特', '《简·爱》夏洛蒂', '《呼啸山庄》艾米莉', '《悲惨世界》雨果',
      '《巴黎圣母院》雨果', '《红与黑》司汤达', '《罪与罚》陀思妥耶夫斯基', '《卡拉马佐夫兄弟》陀思妥耶夫斯基', '《战争与和平》托尔斯泰',
      '《安娜·卡列尼娜》托尔斯泰', '《复活》托尔斯泰', '《静静的顿河》肖洛霍夫', '《钢铁是怎样炼成的》奥斯特洛夫斯基', '《童年》高尔基',
      '《在人间》高尔基', '《我的大学》高尔基', '《普希金诗选》普希金', '《泰戈尔诗选》泰戈尔', '《飞鸟集》泰戈尔',
      '《草叶集》惠特曼', '《神曲》但丁', '《荷马史诗》荷马', '《伊利亚特》荷马', '《奥德赛》荷马',
      '《堂吉诃德》塞万提斯', '《哈姆雷特》莎士比亚', '《罗密欧与朱丽叶》莎士比亚', '《麦克白》莎士比亚', '《李尔王》莎士比亚',
      '《奥赛罗》莎士比亚', '《威尼斯商人》莎士比亚', '《玩偶之家》易卜生', '《等待戈多》贝克特', '《雷雨》曹禺',
      '《茶馆》老舍', '《骆驼祥子》老舍', '《四世同堂》老舍', '《边城》沈从文', '《倾城之恋》张爱玲',
      '《红玫瑰与白玫瑰》张爱玲', '《金锁记》张爱玲', '《呼兰河传》萧红', '《生死场》萧红', '《家》巴金',
      '《春》巴金', '《秋》巴金', '《子夜》茅盾', '《林家铺子》茅盾', '《围城》钱钟书',
      '《我们仨》杨绛', '《走到人生边上》杨绛', '《文化苦旅》余秋雨', '《山居笔记》余秋雨', '《千年一叹》余秋雨',
      '《看见》柴静', '《拖延心理学》简·博克', '《非暴力沟通》马歇尔', '《原则》达利欧', '《思考，快与慢》丹尼尔',
      '《影响力》西奥迪尼', '《乌合之众》勒庞', '《自卑与超越》阿德勒', '《梦的解析》弗洛伊德', '《自控力》凯利',
      '《心流》契克森米哈赖', '《刻意练习》安德斯', '《深度工作》卡尔', '《原子习惯》詹姆斯', '《微习惯》斯蒂芬',
      '《被讨厌的勇气》岸见一郎', '《活着》余华', '《许三观卖血记》余华', '《在细雨中呼喊》余华', '《兄弟》余华',
      '《白鹿原》陈忠实', '《尘埃落定》阿来', '《长恨歌》王安忆', '《芳华》严歌苓', '《陆犯焉识》严歌苓',
      '《一句顶一万句》刘震云', '《我不是潘金莲》刘震云', '《温故一九四二》刘震云', '《暗算》麦家', '《解密》麦家'
    ]
  },
  {
    id: 'music_100',
    emoji: '🎵',
    title: '人生必听 100 首歌',
    description: '用音乐填满人生的每个瞬间',
    color: '#5AC8FA',
    category: '音乐',
    icon: '🎧',
    taskCount: 100,
    tasks: [
      '周杰伦《晴天》', '陈奕迅《十年》', '林俊杰《江南》', '五月天《倔强》', '薛之谦《演员》',
      '邓紫棋《光年之外》', '李荣浩《年少有为》', '毛不易《消愁》', '华晨宇《齐天》', '周深《大鱼》',
      '王菲《红豆》', '张学友《吻别》', '刘德华《忘情水》', '张国荣《沉默是金》', 'Beyond《海阔天空》',
      '邓丽君《月亮代表我的心》', '蔡琴《渡口》', '李宗盛《山丘》', '罗大佑《童年》', '张惠妹《听海》',
      '孙燕姿《遇见》', '蔡依林《日不落》', '萧亚轩《最熟悉的陌生人》', '梁静茹《勇气》', 'SHE《中国话》',
      'Twins《下一站天后》', '容祖儿《挥着翅膀的女孩》', '杨千嬅《小城大事》', '陈奕迅《K歌之王》', '李克勤《红日》',
      'Queen《Bohemian Rhapsody》', 'The Beatles《Hey Jude》', 'Michael Jackson《Billie Jean》', 'Whitney Houston《I Will Always Love You》', 'Elton John《Your Song》',
      'Coldplay《Yellow》', 'Adele《Someone Like You》', 'Ed Sheeran《Shape of You》', 'Taylor Swift《Love Story》', 'John Lennon《Imagine》',
      'Bob Dylan《Blowin\' in the Wind》', 'Nirvana《Smells Like Teen Spirit》', 'Guns N\' Roses《Sweet Child O\' Mine》', 'Metallica《Nothing Else Matters》', 'Pink Floyd《Comfortably Numb》',
      'Led Zeppelin《Stairway to Heaven》', 'The Rolling Stones《(I Can\'t Get No) Satisfaction》', 'U2《With or Without You》', 'Linkin Park《Numb》', 'Eminem《Lose Yourself》',
      'Bruno Mars《Just the Way You Are》', 'Maroon 5《Sugar》', 'Justin Bieber《Love Yourself》', 'Rihanna《Diamonds》', 'Beyoncé《Halo》',
      'Ariana Grande《Thank U, Next》', 'Dua Lipa《Levitating》', 'The Weeknd《Blinding Lights》', 'Billie Eilish《Bad Guy》', 'Lady Gaga《Shallow》',
      'Katy Perry《Firework》', 'Britney Spears《Toxic》', 'Christina Aguilera《Beautiful》', 'Alicia Keys《If I Ain\'t Got You》', 'Mariah Carey《Hero》',
      'Celine Dion《My Heart Will Go On》', 'Sia《Chandelier》', 'Sam Smith《Stay With Me》', 'James Blunt《You\'re Beautiful》', 'Jason Mraz《I\'m Yours》',
      'John Mayer《Gravity》', 'Norah Jones《Don\'t Know Why》', 'Diana Krall《The Look of Love》', 'Miles Davis《So What》', 'Louis Armstrong《What a Wonderful World》',
      'Frank Sinatra《Fly Me to the Moon》', 'Nat King Cole《Unforgettable》', 'Ella Fitzgerald《Summertime》', 'Billie Holiday《Strange Fruit》', 'Aretha Franklin《Respect》',
      'Stevie Wonder《Superstition》', 'Marvin Gaye《What\'s Going On》', 'Al Green《Let\'s Stay Together》', 'Otis Redding《(Sittin\' On) The Dock of the Bay》', 'Ray Charles《Georgia on My Mind》',
      'Bob Marley《No Woman, No Cry》', 'Peter Tosh《Legalize It》', 'Jimmy Cliff《Many Rivers to Cross》', 'Shakira《Hips Don\'t Lie》', 'Enrique Iglesias《Hero》',
      'Luis Fonsi《Despacito》', 'J Balvin《Mi Gente》', 'Rosalía《Malamente》', 'A.R. Rahman《Jai Ho》', 'Bollywood经典歌曲',
      '久石让《天空之城》', '坂本龙一《Merry Christmas Mr. Lawrence》', '中岛美雪《骑在银龙的背上》', '宇多田光《First Love》', '仓木麻衣《Time after time》',
      '韩剧OST', '泰剧OST', '越南神曲', '阿拉伯传统音乐', '非洲鼓乐',
      '维也纳新年音乐会', '肖邦夜曲', '贝多芬第九交响曲', '莫扎特《土耳其进行曲》', '巴赫《G弦上的咏叹调》'
    ]
  },
  {
    id: 'extreme_sports',
    emoji: '🏔️',
    title: '极限运动挑战',
    description: '挑战自我，突破极限',
    color: '#FF3B30',
    category: '挑战',
    icon: '🪂',
    taskCount: 25,
    tasks: [
      '蹦极一次', '跳伞一次', '攀岩一次', '冲浪一次', '滑板一次',
      '滑雪一次', '潜水一次', '滑翔伞一次', '漂流一次', '徒步穿越一次',
      '马拉松一次', '铁人三项一次', '越野跑一次', '山地自行车一次', '攀岩登顶一次',
      '攀冰一次', '探洞一次', '沙漠穿越一次', '极地探险一次', '登山一次',
      '高空秋千一次', '悬崖跳水一次', '风筝冲浪一次', '摩托车越野一次', '翼装飞行一次'
    ]
  },
  {
    id: 'bucket_list',
    emoji: '🪣',
    title: '人生遗愿清单',
    description: '有生之年一定要做的事',
    color: '#FF9500',
    category: '人生',
    icon: '✨',
    taskCount: 50,
    tasks: [
      '看一次极光', '去一次西藏', '坐一次热气球', '潜水看珊瑚礁', '看一次流星雨',
      '在海边看日出', '在山顶看云海', '去一次迪士尼', '参加一次音乐节', '看一次演唱会',
      '做一次志愿者', '献血一次', '领养一只宠物', '种一棵树', '写一本书',
      '学一门外语', '学会一种乐器', '拍一部短片', '办一场个人展览', '做一次公开演讲',
      '独自旅行一次', '和好友来一次公路旅行', '带父母旅行一次', '参加一次马拉松', '爬一座雪山',
      '看一次世界杯', '看一次奥运会', '体验一次禅修', '做一次冥想 retreats', '学习一项武术',
      '开一家小店', '做一次投资人', '买一套自己的房子', '学会投资理财', '实现财务自由',
      '学习摄影', '举办一场派对', '学习插花', '学习茶道', '学习咖啡拉花',
      '做一次蛋糕', '学会调酒', '学会品酒', '学习品鉴咖啡', '学习品鉴威士忌',
      '给未来的自己写一封信', '写一份遗嘱', '拍一组写真', '录制一段给未来孩子的话', '留下一段人生录音'
    ]
  }
];

// 默认寿命假设（岁）
const DEFAULT_LIFE_EXPECTANCY = 80;

// 格言数据
const QUOTES = [
  { text: '人生就像一场旅行，不必在乎目的地，在乎的是沿途的风景以及看风景的心情。', author: '余秋雨' },
  { text: '生活不止眼前的苟且，还有诗和远方的田野。', author: '高晓松' },
  { text: '世界上只有一种真正的英雄主义，那就是在认识生活的真相后依然热爱生活。', author: '罗曼·罗兰' },
  { text: '你今天的努力，是幸运的伏笔，当下的付出，是明日的花开。', author: '佚名' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采' },
  { text: '生命的意义在于活得充实，而不是活得长久。', author: '马丁·路德·金' },
  { text: '人生最大的荣耀不在于从不跌倒，而在于每次跌倒后都能站起来。', author: '曼德拉' },
  { text: '你不能左右天气，但可以改变心情。你不能改变容貌，但可以掌握自己。', author: '佚名' },
];

// 成就徽章配置
const ACHIEVEMENTS = [
  { id: 'first_task', emoji: '⭐', title: '迈出第一步', description: '完成第一个任务', condition: (stats) => stats.totalCompleted >= 1 },
  { id: 'five_tasks', emoji: '🌟', title: '初露锋芒', description: '完成5个任务', condition: (stats) => stats.totalCompleted >= 5 },
  { id: 'ten_tasks', emoji: '💫', title: '小有成就', description: '完成10个任务', condition: (stats) => stats.totalCompleted >= 10 },
  { id: 'twenty_tasks', emoji: '🏆', title: '成就达人', description: '完成20个任务', condition: (stats) => stats.totalCompleted >= 20 },
  { id: 'fifty_tasks', emoji: '👑', title: '人生赢家', description: '完成50个任务', condition: (stats) => stats.totalCompleted >= 50 },
  { id: 'hundred_tasks', emoji: '🏅', title: '传奇人生', description: '完成100个任务', condition: (stats) => stats.totalCompleted >= 100 },
  { id: 'first_list', emoji: '🎯', title: '清单征服者', description: '完成第一个清单', condition: (stats) => stats.completedLists >= 1 },
  { id: 'three_lists', emoji: '🎪', title: '清单大师', description: '完成3个清单', condition: (stats) => stats.completedLists >= 3 },
  { id: 'five_lists', emoji: '🏰', title: '清单王者', description: '完成5个清单', condition: (stats) => stats.completedLists >= 5 },
  { id: 'ten_lists', emoji: '👑', title: '清单皇帝', description: '完成10个清单', condition: (stats) => stats.completedLists >= 10 },
  { id: 'speed', emoji: '⚡', title: '闪电行动', description: '一天内完成3个任务', condition: (stats) => stats.todayCompleted >= 3 },
  { id: 'explorer', emoji: '🧭', title: '探索者', description: '从清单大全添加3个清单', condition: (stats) => stats.templateListsAdded >= 3 },
  { id: 'streak_3', emoji: '🔥', title: '三日火苗', description: '连续打卡3天', condition: (stats) => stats.longestStreak >= 3 },
  { id: 'streak_7', emoji: '⚡', title: '一周坚持', description: '连续打卡7天', condition: (stats) => stats.longestStreak >= 7 },
  { id: 'streak_30', emoji: '🏆', title: '月度达人', description: '连续打卡30天', condition: (stats) => stats.longestStreak >= 30 },
];
