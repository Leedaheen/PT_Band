export default async function openMatchPopup(id) {
  const { data: job, error } = await fetch(`/job/${id}`).then(res => res.json());
  if (error || !job) return alert('글을 불러오지 못했습니다.');

  const popup = document.createElement('div');
  popup.className = 'fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full max-h-[90%] overflow-auto';
  popup.style.transform = 'translate(-50%, -50%)';

  const parts = Array.isArray(job.part) ? job.part : (job.part || '').split(',');
  const checkboxes = parts.map(p => `
    <label class='block text-sm'>
      <input type='checkbox' name='matched_parts' value='${p}' class='mr-1' />${p}
    </label>`).join('');

  popup.innerHTML = `
    <div class='text-right'>
      <button id='close-btn' class='text-sm text-red-500'>✖ 닫기</button>
    </div>
    <form id='match-update-form'>
      <p class='mb-2 text-sm font-semibold'>매칭 상태 변경</p>
      <div class='mb-2'>
        <label class='block text-sm font-medium mb-1'>비밀번호:</label>
        <input required name='password' type='password' maxlength='4' class='border p-1 w-full' />
      </div>
      <div class='mb-2'>
        <label class='block text-sm font-medium mb-1'>매칭 완료된 파트 선택:</label>
        <div class='grid grid-cols-2 gap-1'>${checkboxes}</div>
      </div>
      <div id='admin-pin-toggle' class='hidden mb-2'>
        <label class='text-sm'>
          <input type='checkbox' name='pinned' class='mr-1' /> 📌 상단 고정 (관리자 전용)
        </label>
      </div>
      <div class='text-right mt-4'>
        <button type='submit' class='bg-blue-600 text-white px-3 py-1 rounded'>저장</button>
      </div>
    </form>`;

  document.body.appendChild(popup);
  popup.querySelector('#close-btn').addEventListener('click', () => popup.remove());

  const form = popup.querySelector('#match-update-form');
  const adminToggle = popup.querySelector('#admin-pin-toggle');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const password = formData.get('password');
    const matchedParts = formData.getAll('matched_parts');

    if (password.length !== 4) return alert('비밀번호는 4자리여야 합니다.');

    let isAdmin = false;
    try {
      const verify = await fetch(`/verify-password/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await verify.json();
      isAdmin = result.is_admin;

      if (isAdmin) {
        adminToggle.classList.remove('hidden');
      } else {
        adminToggle.classList.add('hidden');
      }
    } catch (err) {
      return alert('비밀번호 확인 실패');
    }

    try {
      const update = await fetch(`/match/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matched_parts: matchedParts,
          pinned: isAdmin && formData.get('pinned') === 'on'
        })
      });
      const result = await update.json();
      if (!result.success) return alert('저장 실패: ' + (result.message || '오류'));
      alert('매칭 상태가 저장되었습니다.');
      popup.remove();
      if (window.App) window.App.loadJobs();
    } catch (err) {
      alert('서버 오류: ' + err.message);
    }
  });
}
