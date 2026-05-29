/* ============================================================
 * 天算AI · 八字核心计算模块 bazi.js
 * 提供：公历转干支、四柱、藏干、十神、纳音、大运、流年/月/日
 * 注意：本算法为命理学传统算法的工程化简化实现，仅供文化娱乐参考
 * ============================================================ */

// ========== 基础常量 ==========
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干五行属性
const GAN_WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

// 天干阴阳
const GAN_YINYANG = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴'
};

// 地支五行
const ZHI_WUXING = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

// 地支阴阳
const ZHI_YINYANG = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴', '辰': '阳', '巳': '阴',
  '午': '阳', '未': '阴', '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴'
};

// 地支藏干（本气、中气、余气）
const ZHI_CANG_GAN = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '戊', '庚'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

// 地支对应时辰范围（小时）
const ZHI_HOURS = {
  '子': [23, 1], '丑': [1, 3], '寅': [3, 5], '卯': [5, 7],
  '辰': [7, 9], '巳': [9, 11], '午': [11, 13], '未': [13, 15],
  '申': [15, 17], '酉': [17, 19], '戌': [19, 21], '亥': [21, 23]
};

// 地支生肖
const ZHI_SHENGXIAO = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪'
};

// 六十甲子纳音表
const NA_YIN = [
  '海中金', '海中金', '炉中火', '炉中火', '大林木', '大林木',
  '路旁土', '路旁土', '剑锋金', '剑锋金', '山头火', '山头火',
  '涧下水', '涧下水', '城头土', '城头土', '白蜡金', '白蜡金',
  '杨柳木', '杨柳木', '泉中水', '泉中水', '屋上土', '屋上土',
  '霹雳火', '霹雳火', '松柏木', '松柏木', '长流水', '长流水',
  '沙中金', '沙中金', '山下火', '山下火', '平地木', '平地木',
  '壁上土', '壁上土', '金箔金', '金箔金', '覆灯火', '覆灯火',
  '天河水', '天河水', '大驿土', '大驿土', '钗钏金', '钗钏金',
  '桑柘木', '桑柘木', '大溪水', '大溪水', '沙中土', '沙中土',
  '天上火', '天上火', '石榴木', '石榴木', '大海水', '大海水'
];

// 二十四节气近似日期（用于月柱计算）— 立春点（每年2月3-5日）作为年柱分界
// 月柱以节气为分界：立春(寅)→惊蛰(卯)→清明(辰)→立夏(巳)→芒种(午)→小暑(未)→立秋(申)→白露(酉)→寒露(戌)→立冬(亥)→大雪(子)→小寒(丑)
// 简化：使用每年节气固定近似日（误差±1天，对一般年份准确）
const JIE_QI_APPROX = [
  { name: '立春', month: 2,  day: 4,  zhi: '寅' },
  { name: '惊蛰', month: 3,  day: 6,  zhi: '卯' },
  { name: '清明', month: 4,  day: 5,  zhi: '辰' },
  { name: '立夏', month: 5,  day: 6,  zhi: '巳' },
  { name: '芒种', month: 6,  day: 6,  zhi: '午' },
  { name: '小暑', month: 7,  day: 7,  zhi: '未' },
  { name: '立秋', month: 8,  day: 8,  zhi: '申' },
  { name: '白露', month: 9,  day: 8,  zhi: '酉' },
  { name: '寒露', month: 10, day: 8,  zhi: '戌' },
  { name: '立冬', month: 11, day: 7,  zhi: '亥' },
  { name: '大雪', month: 12, day: 7,  zhi: '子' },
  { name: '小寒', month: 1,  day: 6,  zhi: '丑' }
];

// 十神映射表（以日干为主，对照其他干）
// 十神：比肩、劫财、食神、伤官、偏财、正财、七杀、正官、偏印、正印
function getShiShen(dayGan, otherGan) {
  if (!dayGan || !otherGan) return '—';
  const d = GAN_WUXING[dayGan];
  const o = GAN_WUXING[otherGan];
  const dY = GAN_YINYANG[dayGan];
  const oY = GAN_YINYANG[otherGan];
  const same = (dY === oY);
  // 同我者
  if (d === o) return same ? '比肩' : '劫财';
  // 我生者（食伤）：木生火、火生土、土生金、金生水、水生木
  const sheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  // 我克者（财）：木克土、土克水、水克火、火克金、金克木
  const ke = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  // 克我者（官杀）
  const beKe = { '土': '木', '水': '土', '火': '水', '金': '火', '木': '金' };
  // 生我者（印）
  const beSheng = { '火': '木', '土': '火', '金': '土', '水': '金', '木': '水' };

  if (sheng[d] === o) return same ? '食神' : '伤官';
  if (ke[d] === o)    return same ? '偏财' : '正财';
  if (beKe[d] === o)  return same ? '七杀' : '正官';
  if (beSheng[d] === o) return same ? '偏印' : '正印';
  return '—';
}

// ========== 干支序号 ==========
function jiaziIndex(gan, zhi) {
  // 60甲子：以甲子为0
  const gIdx = TIAN_GAN.indexOf(gan);
  const zIdx = DI_ZHI.indexOf(zhi);
  // 寻找在60甲子中的位置
  for (let i = 0; i < 60; i++) {
    if (i % 10 === gIdx && i % 12 === zIdx) return i;
  }
  return 0;
}

function ganZhiByIndex(idx) {
  idx = ((idx % 60) + 60) % 60;
  return TIAN_GAN[idx % 10] + DI_ZHI[idx % 12];
}

// ========== 公历日期 → 四柱 ==========

/**
 * 计算年柱（以立春为界）
 */
function getYearGZ(year, month, day) {
  // 立春点之前算上一年
  const lichun = JIE_QI_APPROX[0]; // 立春 2月4日
  let y = year;
  if (month < lichun.month || (month === lichun.month && day < lichun.day)) {
    y = year - 1;
  }
  // 1984甲子年作为基准
  const offset = (y - 1984) % 60;
  const idx = ((offset % 60) + 60) % 60;
  const gan = TIAN_GAN[((y - 4) % 10 + 10) % 10];
  const zhi = DI_ZHI[((y - 4) % 12 + 12) % 12];
  return { gan, zhi, gz: gan + zhi, yearAdjusted: y };
}

/**
 * 根据节气获得月支与月份序数（寅=1）
 */
function getMonthZhi(year, month, day) {
  // 找到当前所处的节气月：从该日所在月份的节气日开始判断
  // 简化算法：若day < 当月节气日，则归上一节气月
  let zhi = '寅';
  let monthOrder = 1; // 寅=1, 卯=2, ... 丑=12
  for (let i = 0; i < 12; i++) {
    const jq = JIE_QI_APPROX[i];
    const nextJq = JIE_QI_APPROX[(i + 1) % 12];
    // 判断当前日期是否在 jq 与 nextJq 之间
    let inRange = false;
    if (jq.month < nextJq.month || (jq.month === nextJq.month && jq.day < nextJq.day)) {
      // 正常顺序（如 立春 → 惊蛰）
      const after = (month > jq.month) || (month === jq.month && day >= jq.day);
      const before = (month < nextJq.month) || (month === nextJq.month && day < nextJq.day);
      if (after && before) inRange = true;
    } else {
      // 跨年（如 小寒 → 立春，跨1月-2月）
      const after = (month > jq.month) || (month === jq.month && day >= jq.day);
      const before = (month < nextJq.month) || (month === nextJq.month && day < nextJq.day);
      if (after || before) inRange = true;
    }
    if (inRange) {
      zhi = jq.zhi;
      monthOrder = i + 1;
      break;
    }
  }
  return { zhi, monthOrder };
}

/**
 * 月柱：年干推月干（五虎遁元）
 * 甲己之年丙作首，乙庚之年戊为头，丙辛之年寻庚起，丁壬壬位顺行流，戊癸何方求？甲寅之上去寻求
 */
function getMonthGZ(yearGan, year, month, day) {
  const { zhi, monthOrder } = getMonthZhi(year, month, day);
  // 寅月起干表
  const startGanMap = {
    '甲': '丙', '己': '丙',
    '乙': '戊', '庚': '戊',
    '丙': '庚', '辛': '庚',
    '丁': '壬', '壬': '壬',
    '戊': '甲', '癸': '甲'
  };
  const startGan = startGanMap[yearGan] || '丙';
  const startIdx = TIAN_GAN.indexOf(startGan);
  const ganIdx = (startIdx + monthOrder - 1) % 10;
  const gan = TIAN_GAN[ganIdx];
  return { gan, zhi, gz: gan + zhi, monthOrder };
}

/**
 * 日柱：使用通用算法（以1900年1月1日为基准）
 * 1900-01-01 是 甲戌日（注：不同算法基准点不同，这里用经典基准）
 * 实际：1900-01-01 农历公历查表为 甲戌日（jiaziIndex=10）
 */
function getDayGZ(year, month, day) {
  // 计算 1900-01-01 至当日的总天数
  const baseDate = Date.UTC(1900, 0, 1);
  const target = Date.UTC(year, month - 1, day);
  const diffDays = Math.round((target - baseDate) / (24 * 3600 * 1000));
  // 1900-01-01 为 甲戌（甲=0, 戌=10）→ 60甲子序号
  // 验证：1900-01-31 为甲辰；2000-01-01 为戊午
  // 经典：1900-01-01 jiazi index = 10（甲戌）
  const baseIdx = 10;
  const idx = ((baseIdx + diffDays) % 60 + 60) % 60;
  const gan = TIAN_GAN[idx % 10];
  const zhi = DI_ZHI[idx % 12];
  return { gan, zhi, gz: gan + zhi, jiaziIdx: idx };
}

/**
 * 时柱：日干推时干（五鼠遁元）
 * 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
 */
function getHourGZ(dayGan, hour, minute) {
  // 时辰：23-1点为子时
  let zhiIdx;
  if (hour === 23 || hour < 1) zhiIdx = 0; // 子
  else zhiIdx = Math.floor((hour + 1) / 2) % 12;
  const zhi = DI_ZHI[zhiIdx];

  const startGanMap = {
    '甲': '甲', '己': '甲',
    '乙': '丙', '庚': '丙',
    '丙': '戊', '辛': '戊',
    '丁': '庚', '壬': '庚',
    '戊': '壬', '癸': '壬'
  };
  const startGan = startGanMap[dayGan] || '甲';
  const startIdx = TIAN_GAN.indexOf(startGan);
  const ganIdx = (startIdx + zhiIdx) % 10;
  const gan = TIAN_GAN[ganIdx];
  return { gan, zhi, gz: gan + zhi };
}

// ========== 农历转公历（简化版）==========
// 使用1900-2050年农历数据表
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];

function lunarLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function lunarYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  return sum + (lunarLeapMonth(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0);
}
function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0; }

/**
 * 农历转公历
 * @param {number} y 农历年
 * @param {number} m 农历月（1-12）
 * @param {number} d 农历日
 * @param {boolean} isLeap 是否闰月
 */
function lunarToSolar(y, m, d, isLeap = false) {
  let offset = 0;
  for (let i = 1900; i < y; i++) offset += lunarYearDays(i);
  const leap = lunarLeapMonth(y);
  for (let i = 1; i < m; i++) {
    offset += lunarMonthDays(y, i);
    if (i === leap) offset += lunarLeapDays(y);
  }
  if (isLeap && leap === m) offset += lunarMonthDays(y, m);
  offset += d - 1;
  const date = new Date(1900, 0, 31);
  date.setDate(date.getDate() + offset);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

// ========== 完整四柱排盘 ==========

/**
 * 排八字
 * @param {Object} input { year, month, day, hour, minute, calendar:'solar'|'lunar', gender:'male'|'female' }
 * @returns 完整命盘对象
 */
function paipan(input) {
  let { year, month, day, hour, minute, calendar, gender, isLeap } = input;
  hour = parseInt(hour) || 0;
  minute = parseInt(minute) || 0;

  // 农历转公历
  if (calendar === 'lunar') {
    const s = lunarToSolar(year, month, day, !!isLeap);
    year = s.year; month = s.month; day = s.day;
  }

  // 子时跨日处理：23点之后属次日子时
  let dayDate = new Date(year, month - 1, day);
  if (hour >= 23) {
    // 时柱按次日子时算（甲子日23-1点为甲子时，乙丑日23-1点为丙子时...）
    // 这里日柱沿用当日，时柱单独计算
  }

  const yearGZ = getYearGZ(year, month, day);
  const monthGZ = getMonthGZ(yearGZ.gan, year, month, day);
  const dayGZ = getDayGZ(year, month, day);
  const hourGZ = getHourGZ(dayGZ.gan, hour, minute);

  const dayGan = dayGZ.gan;

  // 四柱
  const pillars = {
    year:  { gan: yearGZ.gan,  zhi: yearGZ.zhi,  gz: yearGZ.gz,
             cangGan: ZHI_CANG_GAN[yearGZ.zhi], shiShenGan: getShiShen(dayGan, yearGZ.gan),
             nayin: NA_YIN[jiaziIndex(yearGZ.gan, yearGZ.zhi)] },
    month: { gan: monthGZ.gan, zhi: monthGZ.zhi, gz: monthGZ.gz,
             cangGan: ZHI_CANG_GAN[monthGZ.zhi], shiShenGan: getShiShen(dayGan, monthGZ.gan),
             nayin: NA_YIN[jiaziIndex(monthGZ.gan, monthGZ.zhi)] },
    day:   { gan: dayGZ.gan,   zhi: dayGZ.zhi,   gz: dayGZ.gz,
             cangGan: ZHI_CANG_GAN[dayGZ.zhi], shiShenGan: '日主',
             nayin: NA_YIN[jiaziIndex(dayGZ.gan, dayGZ.zhi)] },
    hour:  { gan: hourGZ.gan,  zhi: hourGZ.zhi,  gz: hourGZ.gz,
             cangGan: ZHI_CANG_GAN[hourGZ.zhi], shiShenGan: getShiShen(dayGan, hourGZ.gan),
             nayin: NA_YIN[jiaziIndex(hourGZ.gan, hourGZ.zhi)] }
  };

  // 五行统计
  const wuxing = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  ['year','month','day','hour'].forEach(p => {
    wuxing[GAN_WUXING[pillars[p].gan]] += 1;
    wuxing[ZHI_WUXING[pillars[p].zhi]] += 1;
  });

  // 大运计算
  const dayun = calcDaYun(yearGZ.gan, monthGZ.gan, monthGZ.zhi, gender, year, month, day);

  // 流年（当前年起后10年）
  const liunian = calcLiuNian(dayGan, new Date().getFullYear(), 10);

  // 流月（当年12个月）
  const liuyue = calcLiuYue(dayGan, new Date().getFullYear());

  // 流日（当前月份30天）
  const liuri = calcLiuRi(dayGan, new Date().getFullYear(), new Date().getMonth() + 1);

  // 终身运势（基于五行强弱与大运推演的拟合曲线）
  const luckCurve = calcLuckCurve(pillars, dayun, gender);

  return {
    input: { year, month, day, hour, minute, calendar, gender },
    pillars,
    wuxing,
    dayun,
    liunian,
    liuyue,
    liuri,
    luckCurve,
    shengxiao: ZHI_SHENGXIAO[yearGZ.zhi],
    dayGan
  };
}

// ========== 大运 ==========
/**
 * 大运起运：阳男阴女顺排，阴男阳女逆排，从月柱开始
 * 起运岁数：简化使用 3 岁起运
 */
function calcDaYun(yearGan, monthGan, monthZhi, gender, year, month, day) {
  const yangGan = ['甲', '丙', '戊', '庚', '壬'];
  const isYangYear = yangGan.includes(yearGan);
  const isMale = gender === 'male';
  const forward = (isYangYear && isMale) || (!isYangYear && !isMale);

  const monthIdx = jiaziIndex(monthGan, monthZhi);
  const list = [];
  // 起运年龄：简化为3岁（实际应根据节气距离精算）
  const startAge = 3;
  const startYear = year + startAge;

  for (let i = 1; i <= 9; i++) {
    const idx = forward ? (monthIdx + i) % 60 : ((monthIdx - i) % 60 + 60) % 60;
    const gan = TIAN_GAN[idx % 10];
    const zhi = DI_ZHI[idx % 12];
    list.push({
      gz: gan + zhi,
      gan, zhi,
      age: startAge + (i - 1) * 10,
      year: startYear + (i - 1) * 10,
      yearEnd: startYear + i * 10 - 1,
      shiShen: '—' // 在外层填充
    });
  }
  return { startAge, forward, list };
}

// ========== 流年 ==========
function calcLiuNian(dayGan, fromYear, count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const y = fromYear + i;
    const gan = TIAN_GAN[((y - 4) % 10 + 10) % 10];
    const zhi = DI_ZHI[((y - 4) % 12 + 12) % 12];
    arr.push({
      year: y, gan, zhi, gz: gan + zhi,
      shiShen: getShiShen(dayGan, gan),
      nayin: NA_YIN[jiaziIndex(gan, zhi)]
    });
  }
  return arr;
}

// ========== 流月 ==========
function calcLiuYue(dayGan, year) {
  // 求该年正月（寅月）干支
  const yearGan = TIAN_GAN[((year - 4) % 10 + 10) % 10];
  const startGanMap = {
    '甲': '丙', '己': '丙', '乙': '戊', '庚': '戊',
    '丙': '庚', '辛': '庚', '丁': '壬', '壬': '壬',
    '戊': '甲', '癸': '甲'
  };
  const startGan = startGanMap[yearGan];
  const startIdx = TIAN_GAN.indexOf(startGan);
  const arr = [];
  // 寅月=1, ... 丑月=12
  const monthNames = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
  // 对应公历月份大约：寅=2月, 卯=3月...
  for (let i = 0; i < 12; i++) {
    const gan = TIAN_GAN[(startIdx + i) % 10];
    const zhi = monthNames[i];
    arr.push({
      monthName: ['正','二','三','四','五','六','七','八','九','十','冬','腊'][i] + '月',
      solarMonth: ((i + 1) % 12) + 1, // 大致公历月份（寅≈2月）
      gan, zhi, gz: gan + zhi,
      shiShen: getShiShen(dayGan, gan),
      nayin: NA_YIN[jiaziIndex(gan, zhi)]
    });
  }
  return arr;
}

// ========== 流日 ==========
function calcLiuRi(dayGan, year, month) {
  const arr = [];
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const gz = getDayGZ(year, month, d);
    arr.push({
      day: d,
      date: `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      gan: gz.gan, zhi: gz.zhi, gz: gz.gz,
      shiShen: getShiShen(dayGan, gz.gan)
    });
  }
  return arr;
}

// ========== 运势曲线（拟合） ==========
function calcLuckCurve(pillars, dayun, gender) {
  // 以日干强弱、十神组合为基础，叠加大运吉凶值，生成 0-100 岁的运势曲线
  const baseScore = 60;
  const curve = [];
  // 计算日干五行在四柱中是否得令、得地、得势
  const dayGan = pillars.day.gan;
  const dayWuxing = GAN_WUXING[dayGan];
  let strength = 0;
  ['year','month','day','hour'].forEach(p => {
    if (GAN_WUXING[pillars[p].gan] === dayWuxing) strength += 10;
    if (ZHI_WUXING[pillars[p].zhi] === dayWuxing) strength += 8;
  });

  // 大运吉凶映射（每柱给一个相对分值）
  const dayunScore = {};
  dayun.list.forEach((d, i) => {
    const ss = getShiShen(dayGan, d.gan);
    let s = 0;
    if (['正官','正印','正财','食神'].includes(ss)) s = 12;
    else if (['七杀','偏印','偏财','伤官'].includes(ss)) s = -6;
    else if (['比肩','劫财'].includes(ss)) s = 4;
    dayunScore[i] = s;
  });

  for (let age = 1; age <= 100; age++) {
    // 找到所属大运
    let dyIdx = Math.floor((age - dayun.startAge) / 10);
    if (dyIdx < 0) dyIdx = -1;
    if (dyIdx >= dayun.list.length) dyIdx = dayun.list.length - 1;
    const dyS = dyIdx >= 0 ? (dayunScore[dyIdx] || 0) : 0;
    // 叠加波动
    const wave = Math.sin(age / 6) * 8 + Math.cos(age / 11) * 5;
    let score = baseScore + strength * 0.3 + dyS + wave;
    // 早年与晚年微调
    if (age < 5) score -= 10;
    if (age > 85) score -= 8;
    score = Math.max(20, Math.min(98, Math.round(score)));
    curve.push({ age, score });
  }
  return curve;
}

// ========== 命理简评生成 ==========
function buildComment(result) {
  const dayGan = result.dayGan;
  const wx = GAN_WUXING[dayGan];
  const wxObj = result.wuxing;
  const sorted = Object.entries(wxObj).sort((a,b) => b[1]-a[1]);
  const strongest = sorted[0][0];
  const weakest = sorted[sorted.length - 1][0];

  const personality = {
    '木': '为人正直仁厚，富有进取心，性情温和而坚韧，喜好成长与开拓。',
    '火': '热情奔放，礼仪周到，富有表现力与号召力，行动果敢。',
    '土': '诚实稳重，信守承诺，包容性强，处事周全可靠。',
    '金': '坚毅果断，重义气讲原则，逻辑清晰，行事干练。',
    '水': '聪慧灵动，善于沟通，思虑周密，应变能力强。'
  };

  const advice = {
    '木': '宜从事教育、文化、出版、林业、纺织、医药等行业。',
    '火': '宜从事能源、电子、传媒、餐饮、娱乐、公关等行业。',
    '土': '宜从事建筑、地产、农业、陶瓷、保险、咨询等行业。',
    '金': '宜从事金融、机械、IT、法律、军警、汽车等行业。',
    '水': '宜从事贸易、物流、旅游、水产、流体、网络等行业。'
  };

  return [
    `日主${dayGan}${wx}，${personality[wx]}`,
    `命局五行以「${strongest}」最旺，「${weakest}」相对薄弱，宜补益其弱、平衡其强。`,
    `生肖属${result.shengxiao}，年柱纳音「${result.pillars.year.nayin}」。`,
    advice[wx]
  ];
}

// 暴露到全局
window.BAZI = {
  TIAN_GAN, DI_ZHI, GAN_WUXING, ZHI_WUXING, ZHI_CANG_GAN, NA_YIN,
  paipan, buildComment, getShiShen, lunarToSolar
};
