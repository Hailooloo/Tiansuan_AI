/* ===========================================================
 * 天算AI · 八字命理查询工具
 * app.js - 主入口
 * 负责：表单交互、人物列表管理、命盘渲染、运势图、流年/月/日切换
 * =========================================================== */

(function () {
  'use strict';

  /* ----------- 五行 -> CSS 后缀 ----------- */
  const WX_CLASS = { '木': 'mu', '火': 'huo', '土': 'tu', '金': 'jin', '水': 'shui' };
  const wxCls = (wx) => 'wx-' + (WX_CLASS[wx] || 'mu');

  /* ----------- 数据存储（localStorage） ----------- */
  const STORAGE_KEY = 'tianai_persons_v1';
  const ACTIVE_KEY = 'tianai_active_v1';

  function loadPersons() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function savePersons(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
  function loadActiveId() { return localStorage.getItem(ACTIVE_KEY) || ''; }
  function saveActiveId(id) { localStorage.setItem(ACTIVE_KEY, id || ''); }

  /* ----------- 全局状态 ----------- */
  const state = {
    persons: loadPersons(),
    activeId: loadActiveId(),
    editingId: null,
    currentLiu: 'year',
    wuxingChart: null,
    luckChart: null,
    lastResult: null
  };

  /* ----------- 工具函数 ----------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const uid = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function createOption(value, text) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = '';
    if (placeholder) sel.appendChild(createOption('', placeholder));
    items.forEach(it => {
      if (typeof it === 'object') sel.appendChild(createOption(it.value, it.text));
      else sel.appendChild(createOption(it, it));
    });
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ----------- 初始化日期/时辰下拉 ----------- */
  function initDateSelects() {
    const yearSel = $('#f-year');
    const monthSel = $('#f-month');
    const daySel = $('#f-day');
    const hourSel = $('#f-hour');
    const minuteSel = $('#f-minute');

    const thisYear = new Date().getFullYear();
    const years = [];
    for (let y = thisYear; y >= 1900; y--) years.push({ value: y, text: y + '年' });
    fillSelect(yearSel, years, '年份');

    const months = [];
    for (let m = 1; m <= 12; m++) months.push({ value: m, text: m + '月' });
    fillSelect(monthSel, months, '月份');

    function refreshDays() {
      const y = +yearSel.value, m = +monthSel.value;
      const max = (y && m) ? new Date(y, m, 0).getDate() : 31;
      const days = [];
      for (let d = 1; d <= max; d++) days.push({ value: d, text: d + '日' });
      const cur = daySel.value;
      fillSelect(daySel, days, '日期');
      if (cur && +cur <= max) daySel.value = cur;
    }
    yearSel.addEventListener('change', refreshDays);
    monthSel.addEventListener('change', refreshDays);
    refreshDays();

    const hours = [];
    for (let h = 0; h < 24; h++) hours.push({ value: h, text: String(h).padStart(2, '0') + '时' });
    fillSelect(hourSel, hours, '时');

    const minutes = [];
    for (let mi = 0; mi < 60; mi += 5) minutes.push({ value: mi, text: String(mi).padStart(2, '0') + '分' });
    fillSelect(minuteSel, minutes, '分');

    // 默认值
    yearSel.value = 1990;
    monthSel.value = 1;
    refreshDays();
    daySel.value = 1;
    hourSel.value = 12;
    minuteSel.value = 0;
  }

  /* ----------- 初始化省市区联动 ----------- */
  function initRegionSelects() {
    const provSel = $('#f-province');
    const citySel = $('#f-city');
    const distSel = $('#f-district');
    const geoInfo = $('#geoInfo');

    const REGIONS = window.REGIONS || {};
    const provNames = Object.keys(REGIONS);
    fillSelect(provSel, provNames, '请选择省份');
    fillSelect(citySel, [], '请选择城市');
    fillSelect(distSel, [], '请选择区/县');

    provSel.addEventListener('change', () => {
      const cities = REGIONS[provSel.value] || {};
      fillSelect(citySel, Object.keys(cities), '请选择城市');
      fillSelect(distSel, [], '请选择区/县');
      geoInfo.textContent = '请继续选择城市和区/县';
      geoInfo.classList.remove('has-geo');
    });

    citySel.addEventListener('change', () => {
      const cities = REGIONS[provSel.value] || {};
      const dists = cities[citySel.value] || {};
      fillSelect(distSel, Object.keys(dists), '请选择区/县');
      geoInfo.textContent = '请继续选择区/县';
      geoInfo.classList.remove('has-geo');
    });

    distSel.addEventListener('change', () => {
      const cities = REGIONS[provSel.value] || {};
      const dists = cities[citySel.value] || {};
      const coord = dists[distSel.value];
      if (coord) {
        geoInfo.innerHTML = `<span class="geo-pin">📍</span> 经度 <b>${coord[1].toFixed(4)}°E</b> · 纬度 <b>${coord[0].toFixed(4)}°N</b>`;
        geoInfo.classList.add('has-geo');
      } else {
        geoInfo.textContent = '请选择出生地';
        geoInfo.classList.remove('has-geo');
      }
    });
  }

  /* ----------- 表单 <-> 数据 ----------- */
  function readForm() {
    const name = $('#f-name').value.trim();
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const calendar = document.querySelector('input[name="calendar"]:checked').value;
    const year = +$('#f-year').value;
    const month = +$('#f-month').value;
    const day = +$('#f-day').value;
    const hour = +$('#f-hour').value;
    const minute = +$('#f-minute').value || 0;
    const province = $('#f-province').value;
    const city = $('#f-city').value;
    const district = $('#f-district').value;

    if (!name) { alert('请输入姓名'); return null; }
    if (!year || !month || !day) { alert('请选择完整的出生日期'); return null; }
    if ($('#f-hour').value === '') { alert('请选择出生时辰'); return null; }
    if (!province || !city || !district) { alert('请选择完整的出生地'); return null; }

    const coord = (window.REGIONS[province] && window.REGIONS[province][city] && window.REGIONS[province][city][district]) || null;

    return {
      id: state.editingId || uid(),
      name, gender, calendar,
      year, month, day, hour, minute,
      province, city, district,
      lat: coord ? coord[0] : null,
      lng: coord ? coord[1] : null,
      createdAt: Date.now()
    };
  }

  function writeForm(p) {
    if (!p) return;
    $('#f-name').value = p.name || '';
    document.querySelector(`input[name="gender"][value="${p.gender}"]`).checked = true;
    document.querySelector(`input[name="calendar"][value="${p.calendar}"]`).checked = true;
    $('#f-year').value = p.year;
    $('#f-month').value = p.month;
    $('#f-month').dispatchEvent(new Event('change'));
    $('#f-day').value = p.day;
    $('#f-hour').value = p.hour;
    $('#f-minute').value = p.minute || 0;

    $('#f-province').value = p.province;
    $('#f-province').dispatchEvent(new Event('change'));
    $('#f-city').value = p.city;
    $('#f-city').dispatchEvent(new Event('change'));
    $('#f-district').value = p.district;
    $('#f-district').dispatchEvent(new Event('change'));
  }

  function resetForm() {
    state.editingId = null;
    $('#baziForm').reset();
    document.querySelector('input[name="gender"][value="male"]').checked = true;
    document.querySelector('input[name="calendar"][value="solar"]').checked = true;
    $('#f-year').value = 1990;
    $('#f-month').value = 1;
    $('#f-month').dispatchEvent(new Event('change'));
    $('#f-day').value = 1;
    $('#f-hour').value = 12;
    $('#f-minute').value = 0;
    $('#f-province').value = '';
    fillSelect($('#f-city'), [], '请选择城市');
    fillSelect($('#f-district'), [], '请选择区/县');
    $('#geoInfo').textContent = '请选择出生地';
    $('#geoInfo').classList.remove('has-geo');
  }

  /* ----------- 命主列表 ----------- */
  function renderPersonList() {
    const list = $('#personList');
    const empty = $('#emptyTip');
    list.innerHTML = '';

    if (state.persons.length === 0) {
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      state.persons.forEach(p => {
        const item = document.createElement('div');
        item.className = 'person-item' + (p.id === state.activeId ? ' active' : '');
        item.innerHTML = `
          <div class="avatar">${p.gender === 'male' ? '♂' : '♀'}</div>
          <div class="info">
            <h4>${escapeHTML(p.name)} <span class="gender-tag">${p.gender === 'male' ? '男' : '女'}</span></h4>
            <p>${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')} ${String(p.hour).padStart(2,'0')}:${String(p.minute||0).padStart(2,'0')} · ${p.calendar === 'solar' ? '公历' : '农历'}</p>
            <p>📍 ${escapeHTML(p.province)} · ${escapeHTML(p.city)} · ${escapeHTML(p.district)}</p>
          </div>
          <div class="actions">
            <button class="icon-btn" data-act="edit" data-id="${p.id}" title="修改">✏️</button>
            <button class="icon-btn" data-act="del" data-id="${p.id}" title="删除">🗑</button>
          </div>
        `;
        item.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          state.activeId = p.id;
          saveActiveId(p.id);
          renderPersonList();
          renderResult();
          if (isMobile()) switchMobileTab('result');
        });
        list.appendChild(item);
      });

      list.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const act = btn.getAttribute('data-act');
          if (act === 'edit') startEdit(id);
          else if (act === 'del') confirmDelete(id);
        });
      });
    }

    $('#listCount').textContent = state.persons.length;
    $('#mListCount').textContent = state.persons.length;
  }

  function startEdit(id) {
    const p = state.persons.find(x => x.id === id);
    if (!p) return;
    state.editingId = id;
    writeForm(p);
    switchTab('form');
    if (isMobile()) switchMobileTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function confirmDelete(id) {
    const p = state.persons.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`确认删除命主「${p.name}」？此操作不可恢复。`)) return;
    state.persons = state.persons.filter(x => x.id !== id);
    if (state.activeId === id) {
      state.activeId = state.persons[0] ? state.persons[0].id : '';
      saveActiveId(state.activeId);
    }
    savePersons(state.persons);
    renderPersonList();
    renderResult();
  }

  /* ----------- 命盘渲染 ----------- */
  function renderResult() {
    const empty = $('#resultEmpty');
    const content = $('#resultContent');
    const p = state.persons.find(x => x.id === state.activeId);
    if (!p) {
      empty.style.display = 'flex';
      content.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    content.style.display = 'block';

    const result = window.BAZI.paipan({
      year: p.year, month: p.month, day: p.day,
      hour: p.hour, minute: p.minute || 0,
      calendar: p.calendar, gender: p.gender
    });
    state.lastResult = result;

    // 头部
    $('#personAvatar').textContent = p.gender === 'male' ? '♂' : '♀';
    $('#resName').textContent = `${p.name} · ${p.gender === 'male' ? '乾造' : '坤造'}`;
    const cd = p.calendar === 'solar' ? '公历' : '农历';
    $('#resBirth').textContent = `${cd} ${p.year}年${p.month}月${p.day}日 ${String(p.hour).padStart(2,'0')}:${String(p.minute||0).padStart(2,'0')}（生肖${result.shengxiao}）`;
    const geoStr = (p.lat != null && p.lng != null) ? ` · ${p.lng.toFixed(4)}°E ${p.lat.toFixed(4)}°N` : '';
    $('#resLocation').textContent = `📍 ${p.province} ${p.city} ${p.district}${geoStr}`;

    // 标签
    const tagsBox = $('#baziTags');
    tagsBox.innerHTML = '';
    const fourGZ = ['year', 'month', 'day', 'hour'].map(k => result.pillars[k].gz).join(' ');
    const dayWx = window.BAZI.GAN_WUXING[result.dayGan];
    const tagList = [
      `八字 ${fourGZ}`,
      `日主 ${result.dayGan}（${dayWx}）`,
      `生肖 ${result.shengxiao}`,
      `纳音 ${result.pillars.year.nayin}`
    ];
    tagsBox.innerHTML = tagList.map(t => `<span class="bazi-tag">${escapeHTML(t)}</span>`).join('');

    // 四柱
    ['year', 'month', 'day', 'hour'].forEach(k => {
      const pi = result.pillars[k];
      $('#ss-' + k).textContent = pi.shiShenGan;
      const ganEl = $('#gan-' + k);
      const zhiEl = $('#zhi-' + k);
      ganEl.textContent = pi.gan;
      zhiEl.textContent = pi.zhi;
      ganEl.className = 'gan-cell ' + wxCls(window.BAZI.GAN_WUXING[pi.gan]);
      zhiEl.className = 'zhi-cell ' + wxCls(window.BAZI.ZHI_WUXING[pi.zhi]);
      $('#cg-' + k).innerHTML = (pi.cangGan || []).map(g =>
        `<span class="cg-tag ${wxCls(window.BAZI.GAN_WUXING[g])}">${g}</span>`
      ).join('');
      $('#ny-' + k).textContent = pi.nayin;
    });

    // 五行图
    renderWuxingChart(result.wuxing);

    // 大运
    renderDayun(result);

    // 流年/月/日
    state.currentLiu = 'year';
    $$('.liu-tab').forEach(t => t.classList.toggle('active', t.dataset.liu === 'year'));
    renderLiu(result, 'year');

    // 运势图
    renderLuckChart(result.luckCurve, result.dayun);

    // 简评
    const comments = window.BAZI.buildComment(result);
    $('#commentBox').innerHTML = comments.map(c => `<p>· ${escapeHTML(c)}</p>`).join('');
  }

  /* ----------- 五行分布图 ----------- */
  function renderWuxingChart(wuxing) {
    const dom = $('#wuxingChart');
    if (!state.wuxingChart) state.wuxingChart = echarts.init(dom);
    const colorMap = { '木': '#4caf50', '火': '#f44336', '土': '#d4af37', '金': '#cccccc', '水': '#2196f3' };
    const data = Object.entries(wuxing).map(([k, v]) => ({
      name: k, value: v, itemStyle: { color: colorMap[k] }
    }));
    state.wuxingChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}：{c} 个 ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#cbb88a' } },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '45%'],
        label: { color: '#e8d9aa', formatter: '{b}\n{c}' },
        labelLine: { lineStyle: { color: '#7a6a44' } },
        data
      }]
    }, true);
    state.wuxingChart.resize();
  }

  /* ----------- 大运渲染 ----------- */
  function renderDayun(result) {
    const box = $('#dayunList');
    const dayGan = result.dayGan;
    const items = result.dayun.list.map(d => {
      const ss = window.BAZI.getShiShen(dayGan, d.gan);
      const wxGan = window.BAZI.GAN_WUXING[d.gan];
      const wxZhi = window.BAZI.ZHI_WUXING[d.zhi];
      const cgArr = window.BAZI.ZHI_CANG_GAN[d.zhi] || [];
      return `
        <div class="dayun-item">
          <div class="age">${d.age}~${d.age + 9}岁</div>
          <div class="age">${d.year}-${d.yearEnd}</div>
          <div class="ss">${ss}</div>
          <div class="gz">
            <span class="${wxCls(wxGan)}">${d.gan}</span><span class="${wxCls(wxZhi)}">${d.zhi}</span>
          </div>
          <div class="cg-row">${cgArr.map(g => `<span class="cg-mini ${wxCls(window.BAZI.GAN_WUXING[g])}">${g}</span>`).join('')}</div>
        </div>
      `;
    }).join('');
    const dir = result.dayun.forward ? '顺排' : '逆排';
    box.innerHTML = `<div class="dayun-info">起运：${result.dayun.startAge}岁 · ${dir}</div>` + items;
  }

  /* ----------- 流年/流月/流日渲染 ----------- */
  function renderLiu(result, type) {
    const box = $('#liuContent');
    let html = '';
    if (type === 'year') {
      html = result.liunian.map(l => `
        <div class="liu-item">
          <div class="label">${l.year}年</div>
          <div class="gz">
            <span class="${wxCls(window.BAZI.GAN_WUXING[l.gan])}">${l.gan}</span><span class="${wxCls(window.BAZI.ZHI_WUXING[l.zhi])}">${l.zhi}</span>
          </div>
          <div class="ss">${l.shiShen}</div>
          <div class="label">${l.nayin}</div>
        </div>
      `).join('');
    } else if (type === 'month') {
      html = result.liuyue.map(l => `
        <div class="liu-item">
          <div class="label">${l.monthName}</div>
          <div class="gz">
            <span class="${wxCls(window.BAZI.GAN_WUXING[l.gan])}">${l.gan}</span><span class="${wxCls(window.BAZI.ZHI_WUXING[l.zhi])}">${l.zhi}</span>
          </div>
          <div class="ss">${l.shiShen}</div>
        </div>
      `).join('');
    } else if (type === 'day') {
      html = result.liuri.map(l => `
        <div class="liu-item">
          <div class="label">${l.day}日</div>
          <div class="gz">
            <span class="${wxCls(window.BAZI.GAN_WUXING[l.gan])}">${l.gan}</span><span class="${wxCls(window.BAZI.ZHI_WUXING[l.zhi])}">${l.zhi}</span>
          </div>
          <div class="ss">${l.shiShen}</div>
        </div>
      `).join('');
    }
    box.innerHTML = html;
  }

  /* ----------- 运势曲线 ----------- */
  function renderLuckChart(curve, dayun) {
    const dom = $('#luckChart');
    if (!state.luckChart) state.luckChart = echarts.init(dom);
    const xs = curve.map(c => c.age);
    const ys = curve.map(c => c.score);

    const markLines = dayun.list.map(d => ({
      xAxis: d.age,
      label: { formatter: d.gz, color: '#cbb88a', fontSize: 11 },
      lineStyle: { color: 'rgba(203,184,138,0.25)', type: 'dashed' }
    }));

    state.luckChart.setOption({
      tooltip: { trigger: 'axis', formatter: p => `${p[0].axisValue}岁 · 运势分 ${p[0].data}` },
      grid: { left: 40, right: 20, top: 30, bottom: 40 },
      xAxis: {
        type: 'category', data: xs, name: '年龄',
        nameTextStyle: { color: '#cbb88a' },
        axisLabel: { color: '#cbb88a', interval: 9 },
        axisLine: { lineStyle: { color: '#7a6a44' } }
      },
      yAxis: {
        type: 'value', name: '运势分', min: 0, max: 100,
        nameTextStyle: { color: '#cbb88a' },
        axisLabel: { color: '#cbb88a' },
        splitLine: { lineStyle: { color: 'rgba(122,106,68,0.25)' } }
      },
      series: [{
        type: 'line', smooth: true, data: ys, symbol: 'none',
        lineStyle: { color: '#e6c97a', width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(230,201,122,0.55)' },
              { offset: 1, color: 'rgba(230,201,122,0.05)' }
            ]
          }
        },
        markLine: { silent: true, symbol: 'none', data: markLines }
      }]
    }, true);
    state.luckChart.resize();
  }

  /* ----------- Tab 切换 ----------- */
  function switchTab(name) {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + name));
  }

  function switchMobileTab(name) {
    document.body.setAttribute('data-mview', name);
    $$('.mtab').forEach(b => b.classList.toggle('active', b.dataset.mtab === name));
    setTimeout(() => {
      state.wuxingChart && state.wuxingChart.resize();
      state.luckChart && state.luckChart.resize();
    }, 60);
  }

  function isMobile() { return window.innerWidth <= 768; }

  /* ----------- 事件绑定 ----------- */
  function bindEvents() {
    $('#baziForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const p = readForm();
      if (!p) return;
      const idx = state.persons.findIndex(x => x.id === p.id);
      if (idx >= 0) state.persons[idx] = p;
      else state.persons.push(p);
      savePersons(state.persons);
      state.activeId = p.id;
      saveActiveId(p.id);
      state.editingId = null;
      renderPersonList();
      renderResult();
      if (isMobile()) switchMobileTab('result');
      else switchTab('list');
    });

    $('#btnReset').addEventListener('click', resetForm);

    $('#btn-add-person').addEventListener('click', () => {
      resetForm();
      switchTab('form');
      if (isMobile()) switchMobileTab('form');
    });

    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    $$('.liu-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.liu-tab').forEach(b => b.classList.toggle('active', b === btn));
        const t = btn.dataset.liu;
        state.currentLiu = t;
        if (state.lastResult) renderLiu(state.lastResult, t);
      });
    });

    $$('.mtab').forEach(btn => {
      btn.addEventListener('click', () => switchMobileTab(btn.dataset.mtab));
    });

    window.addEventListener('resize', () => {
      state.wuxingChart && state.wuxingChart.resize();
      state.luckChart && state.luckChart.resize();
    });
  }

  /* ----------- 启动 ----------- */
  function init() {
    initDateSelects();
    initRegionSelects();
    bindEvents();
    renderPersonList();

    document.body.setAttribute('data-mview', 'form');

    if (state.persons.length > 0) {
      if (!state.activeId || !state.persons.find(p => p.id === state.activeId)) {
        state.activeId = state.persons[0].id;
        saveActiveId(state.activeId);
      }
      renderResult();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
