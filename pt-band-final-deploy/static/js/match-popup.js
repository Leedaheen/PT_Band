<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const App = {
  supabase,
  jobs: [],
  filteredJobs: [],
  pageSize: 10,
  currentPage: 1,
  selectedType: '전체',

  init() {
    console.log("✅ App.init", this.supabase);
    this.loadJobs();
    this.initRealtime();

    document.getElementById('open-form-btn')
      .addEventListener('click', () => this.openForm());

    document.querySelectorAll('.filter-btn')
      .forEach(btn => btn.addEventListener('click', () => {
        this.selectedType = btn.textContent;
        this.applyFilters();
      }));

    document.getElementById('regionFilter')
      .addEventListener('change', () => this.applyFilters());

    document.querySelectorAll('.part-filter')
      .forEach(chk => chk.addEventListener('change', () => this.applyFilters()));
  },

  initRealtime() {
    this.supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' },
          () => this.loadJobs()
      )
      .subscribe();
  },

  async loadJobs() {
    const { data, error } = await this.supabase
      .from('jobs').select('*').order('created_at', { ascending: false });
    if (error) return console.error("❌ loadJobs 오류:", error);
    this.jobs = data;

    // 지역 옵션 갱신
    const regions = Array.from(new Set(this.jobs.map(j=>j.region||'경기도 > 평택시')));
    const regionSel = document.getElementById('regionFilter');
    regionSel.innerHTML = '<option value="전체">전체</option>' +
      regions.map(r=>`<option value="${r}">${r}</option>`).join('');

    this.applyFilters();
  },

  applyFilters() {
    const region = document.getElementById('regionFilter').value;
    const parts  = [...document.querySelectorAll('.part-filter:checked')].map(c=>c.value);

    this.filteredJobs = this.jobs.filter(job => {
      let ok = true;
      if (this.selectedType==='매칭완료') ok = job.is_matched;
      else if (this.selectedType!=='전체') ok = job.type===this.selectedType;
      if (ok && region!=='전체') ok = (job.region||'경기도 > 평택시')===region;

      if (ok && parts.length) {
        let arr = [];
        if (Array.isArray(job.part)) arr = job.part;
        else if (typeof job.part==='string') {
          try { arr = JSON.parse(job.part); }
          catch { arr = job.part.split(','); }
        }
        ok = parts.some(p=>arr.includes(p));
      }
      return ok;
    });

    this.currentPage = 1;
    this.renderPage();
    this.renderPagination();
  },

  renderPage() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.renderJobs(this.filteredJobs.slice(start, start + this.pageSize));
  },

  renderJobs(jobs) {
    const container = document.getElementById('job-list');
    container.innerHTML = '';

    jobs.forEach(job => {
      // part 배열 보장
      let partsArray = [];
      if (Array.isArray(job.part)) partsArray = job.part;
      else if (typeof job.part==='string') {
        try { partsArray = JSON.parse(job.part); }
        catch { partsArray = job.part.split(','); }
      }

      const emojiMap = {
        '보컬(남)':'🎤','보컬(여)':'🎤','드럼':'🥁',
        '베이스':'🎸','기타':'🎸','키보드':'🎹','그 외':'🔸'
      };
      const partsHtml = partsArray.map(p=>`${emojiMap[p]||''}${p}`).join(' / ');

      // 깔끔한 리본 배지
      const pinHtml = job.pinned
        ? `<div class="absolute top-2 right-2 bg-yellow-400 text-gray-800 text-xs font-bold px-2 py-0.5 transform rotate-45 shadow-md origin-top-right">PINNED</div>`
        : '';

      const el = document.createElement('div');
      el.className = 'bg-white p-4 rounded shadow relative job-item';
      el.dataset.id      = job.id;
      el.dataset.type    = job.type;
      el.dataset.matched = job.is_matched;
      el.dataset.pinned  = job.pinned;
      el.dataset.region  = job.region||'경기도 > 평택시';
      el.dataset.parts   = partsArray.join(',');

      el.innerHTML = `
        <div class="relative">
          ${pinHtml}
          <h2 class="text-lg font-semibold mb-1">
            ${job.type==='구직' ? `[ ${partsHtml} ]` : `[${job.team||'팀명 미정'}]`}
            <span class="text-sm text-gray-500 ml-1">
              (${job.region||'경기도 > 평택시'} / ${job.type==='구직'?'데려가세요!':'모집합니다!'})
            </span>
          </h2>
          <p class="text-sm text-gray-600 mb-2">
            ${job.type==='구인'
              ? `<strong>${partsHtml}</strong> 멤버가 필요해요!`
              : job.intro||''}
          </p>
          <div class="expand-content hidden text-sm text-gray-600 mb-2">
            <p><strong>오픈톡 닉네임:</strong> ${job.nickname||'-'}</p>
            <p><strong>위치:</strong> ${job.location||'-'}</p>
            <p><strong>나이:</strong> ${job.age||'-'}</p>
            ${job.fee?`<p><strong>월 회비:</strong> ${job.fee}</p>`:''}
            <p><strong>소개:</strong> ${job.intro||'-'}</p>
          </div>
          <div class="flex justify-between items-end">
            <span class="text-xs text-blue-500 cursor-pointer" onclick="App.toggleExpand(this)">&lt;더 보기&gt;</span>
            <div class="text-right">
              <p class="text-xs text-gray-400 mb-1">🕒 ${new Date(job.updated_at||job.created_at).toLocaleString()}</p>
              <a href="tel:${job.contact}"
                 onclick="App.incrementClick(${job.id})"
                 class="text-xs bg-blue-500 text-white px-1.5 py-[9px] rounded inline-block">
                연락처 확인
              </a>
              <p class="text-xs text-gray-400 mt-1">👁 <span class="click-count">${job.clicks||0}</span>명이 확인</p>
            </div>
          </div>
          <div class="absolute top-2 right-3">
            <button class="text-xs text-gray-600 hover:underline"
                    onclick="App.openMatchPopup(${job.id})">
              매칭상태 변경
            </button>
          </div>
        </div>`;
      container.appendChild(el);
    });
  },

  renderPagination() {
    const total = Math.ceil(this.filteredJobs.length / this.pageSize);
    const pager = document.getElementById('pagination');
    pager.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `px-3 py-1 border rounded ${i===this.currentPage?'bg-blue-600 text-white':'bg-white'}`;
      btn.addEventListener('click', () => {
        this.currentPage = i;
        this.renderPage();
      });
      pager.appendChild(btn);
    }
  },

  toggleExpand(el) {
    const content = el.closest('.job-item').querySelector('.expand-content');
    content.classList.toggle('hidden');
    el.textContent = content.classList.contains('hidden') ? '<더 보기>' : '<접기>';
  },

  async incrementClick(id) {
    const job = this.jobs.find(j=>j.id===id);
    const newCount = (job.clicks||0) + 1;
    const { error } = await this.supabase
      .from('jobs').update({ clicks: newCount }).eq('id', id);
    if (error) return console.error("❌ incrementClick 오류:", error);
    job.clicks = newCount;
    this.renderPage();
  },

  openForm() {
    import('/static/js/form-popup.js')
      .then(m=>m.default(this.supabase))
      .catch(console.error);
  },

  openMatchPopup(id) {
    import('/static/js/match-popup.js')
      .then(m=>m.default(id))
      .catch(console.error);
  }
};

window.App = App;
App.init();
</script>
