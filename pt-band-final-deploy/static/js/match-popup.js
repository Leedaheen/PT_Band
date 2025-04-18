import openForm from '/static/js/form-popup.js';

export default function openMatchPopup(jobId) {
  const supabase = App.supabase;
  // 1) 비밀번호 입력 모달
  const pwModal = document.createElement('div');
  pwModal.id = 'password-modal';
  pwModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50';
  pwModal.innerHTML = `
    <div id="password-modal-content" class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-xl font-semibold mb-4">비밀번호 확인</h2>
      <input id="password-input" type="password" placeholder="비밀번호" class="border p-2 w-full mb-4" />
      <div class="flex justify-end space-x-2">
        <button id="pw-cancel" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
        <button id="pw-submit" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
      </div>
    </div>`;
  document.body.appendChild(pwModal);
  const content = document.getElementById('password-modal-content');
  content.addEventListener('click', e => e.stopPropagation());
  pwModal.addEventListener('click', () => pwModal.remove());
  document.getElementById('pw-cancel').addEventListener('click', e => { e.stopPropagation(); pwModal.remove(); });

  // 2) 비밀번호 검증
  document.getElementById('pw-submit').addEventListener('click', async e => {
    e.stopPropagation();
    const password = document.getElementById('password-input').value.trim();
    if (!password) { alert('비밀번호를 입력해주세요.'); return; }
    try {
      const res = await fetch(`/verify-password/${jobId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) { throw new Error(data.message); }
      pwModal.remove();
      renderEditForm(data.job, password);
    } catch(err) {
      alert(err.message || '비밀번호 검증 실패');
      pwModal.remove();
    }
  });
}

function renderEditForm(job, password) {
  // 3) 수정 폼 모달
  const formModal = document.createElement('div');
  formModal.id = 'match-modal';
  formModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50';
  // 파트 옵션
  const parts = Array.isArray(job.part) ? job.part : [];
  const matched = Array.isArray(job.matched_parts) ? job.matched_parts : [];
  const partOptions = parts.map(p => `
    <label class="block mb-1">
      <input type="checkbox" name="match" value="${p}" ${matched.includes(p)?'checked':''}/> ${p}
    </label>`).join('');
  formModal.innerHTML = `
    <div id="match-modal-content" class="bg-white p-6 rounded shadow-lg max-w-md w-full overflow-auto">
      <h2 class="text-xl font-semibold mb-4">글 수정 및 매칭</h2>
      <form id="edit-form" class="space-y-3">
        <input name="team" value="${job.team||''}" placeholder="밴드명" class="border p-2 w-full"/>
        <input name="nickname" value="${job.nickname||''}" placeholder="오픈톡 닉네임" class="border p-2 w-full"/>
        <input name="age" value="${job.age||''}" placeholder="연령대" class="border p-2 w-full"/>
        <select name="region" class="border p-2 w-full">
          <option ${job.region==='경기도 > 평택시'?'selected':''}>경기도 > 평택시</option>
          <option ${job.region==='경기도 > 오산시'?'selected':''}>경기도 > 오산시</option>
          <option ${job.region==='경기도 > 화성시'?'selected':''}>경기도 > 화성시</option>
          <option ${job.region==='경기도 > 안성시'?'selected':''}>경기도 > 안성시</option>
          <option ${job.region==='서울특별시 > 강남구'?'selected':''}>서울특별시 > 강남구</option>
        </select>
        <input name="location" value="${job.location||''}" placeholder="위치" class="border p-2 w-full"/>
        <input name="fee" value="${job.fee||''}" placeholder="월 회비" class="border p-2 w-full"/>
        <input name="contact" value="${job.contact||''}" placeholder="연락처" class="border p-2 w-full"/>
        <textarea name="intro" placeholder="소개글" class="border p-2 w-full" maxlength="100">${job.intro||''}</textarea>
        <div>
          <p class="font-semibold">매칭 완료할 파트 선택:</p>
          ${partOptions}
        </div>
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-edit" class="bg-gray-500 text-white px-4 py-2 rounded">취소</button>
          <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">저장</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(formModal);
  const content = document.getElementById('match-modal-content');
  content.addEventListener('click', e=>e.stopPropagation());
  formModal.addEventListener('click', ()=>formModal.remove());
  document.getElementById('cancel-edit').addEventListener('click', e=>{ e.stopPropagation(); formModal.remove(); });

  // 4) 저장 처리
  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const selected = Array.from(form.getAll('match'));
    const payload = {
      password,
      parts: selected,
      team: form.get('team'),
      nickname: form.get('nickname'),
      age: form.get('age'),
      region: form.get('region'),
      location: form.get('location'),
      fee: form.get('fee'),
      contact: form.get('contact'),
      intro: form.get('intro')
    };
    try {
      const res = await fetch(`/update/${job.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('수정 및 매칭 완료!');
      formModal.remove();
    } catch(err) {
      alert(err.message);
    }
  });
}
