import openForm from '/static/js/form-popup.js';

export default async function openMatchPopup(id) {
  // 1) 비밀번호 입력
  const pw = prompt('비밀번호를 입력하세요');
  if (!pw) return;

  // 2) 서버에 비밀번호 검증 요청
  const verifyRes = await fetch(`/verify-password/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.success) {
    return alert(verifyData.message || '비밀번호 검증에 실패했습니다.');
  }

  // 3) 팝업 UI 생성
  const job = verifyData.job;
  const parts = Array.isArray(job.part) ? job.part : [];
  const matchedParts = Array.isArray(job.matched_parts) ? job.matched_parts : [];
  const partOptions = parts.map(p => `
    <label class="block mb-1">
      <input type="checkbox" name="match" value="${p}"
             ${matchedParts.includes(p) ? 'checked' : ''}/>
      ${p}
    </label>`).join('');

  const popup = document.createElement('div');
  popup.className = 'fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full max-h-[90%] overflow-auto';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.innerHTML = `
    <div class="text-right mb-2">
      <button id="close-match-btn" class="text-sm text-red-500">✖ 닫기</button>
    </div>
    <form id="match-form">
      <p class="mb-2 text-sm font-semibold">매칭 상태 변경</p>
      ${parts.length ? partOptions : '<p>등록된 파트가 없습니다.</p>'}
      <div class="mt-3 text-right">
        <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">저장</button>
      </div>
    </form>`;
  document.body.appendChild(popup);

  popup.querySelector('#close-match-btn').onclick = () => popup.remove();

  // 4) 저장 처리
  popup.querySelector('#match-form').onsubmit = async e => {
    e.preventDefault();
    const selected = [...popup.querySelectorAll('input[name="match"]:checked')].map(i => i.value);
    const isMatched = selected.length === parts.length;

    const res = await fetch(`/update/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, parts: selected })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      alert(result.message || '저장에 실패했습니다.');
    } else {
      popup.remove();
    }
  };
}
