export default function openMatchPopup(index) {
  const job = jobs[index];  // 해당 job 정보 가져오기
  const isJobTypeRecruit = job.type === '구인'; // 구인/구직 구분

  const pw = prompt("비밀번호를 입력하세요");
  if (!pw) return;  // 비밀번호가 입력되지 않으면 종료

  // 비밀번호 확인을 위한 요청
  fetch(`/verify-password/${index}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) return alert("비밀번호가 일치하지 않습니다.");

    const job = data.job;  // 비밀번호가 맞으면 job 정보 받아옴
    const parts = job.part || [];  // 구직 파트 정보
    const partOptions = parts.map(part => `
      <label>
        <input type='checkbox' name='match' value='${part}' ${job.matched_parts[part] ? 'checked' : ''}>
        ${part}
      </label>
    `).join('<br>');  // 파트 옵션 목록 생성

    // 팝업 생성
    const popup = document.createElement('div');
    popup.className = 'fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.innerHTML = `
      <div class='text-right mb-2'>
        <button onclick='this.parentElement.parentElement.remove()' class='text-sm text-red-500'>✖ 닫기</button>
      </div>
      <form id='match-form'>
        <p class='mb-2 text-sm font-semibold'>글 수정 및 매칭완료 설정</p>
        <input type='text' name='team' value='${job.team}' placeholder='팀명' class='border p-1 w-full mb-2' />
        <input type='text' name='location' value='${job.location}' placeholder='위치' class='border p-1 w-full mb-2' />
        <input type='text' name='type' value='${job.type}' placeholder='구분' class='border p-1 w-full mb-2' />
        <input type='text' name='age' value='${job.age}' placeholder='연령대' class='border p-1 w-full mb-2' />
        <select required name="region" class="border p-1 w-full mb-2">
          <option value="경기도 > 평택시" ${job.region === "경기도 > 평택시" ? 'selected' : ''}>경기도 > 평택시</option>
          <option value="경기도 > 오산시" ${job.region === "경기도 > 오산시" ? 'selected' : ''}>경기도 > 오산시</option>
          <option value="경기도 > 화성시" ${job.region === "경기도 > 화성시" ? 'selected' : ''}>경기도 > 화
