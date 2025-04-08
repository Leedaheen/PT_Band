export default function openMatchPopup(index) {
  // 비밀번호 입력
  const pw = prompt("비밀번호를 입력하세요");
  if (!pw) return;  // 비밀번호가 없으면 종료

  // 비밀번호 확인을 위한 요청
  fetch(`/verify-password/${index}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) return alert("비밀번호가 일치하지 않습니다.");
      
      const job = data.job;
      const parts = job.part || [];
      
      // 기본 값은 체크 해제
      const partOptions = parts.map(part => `
        <label>
          <input type='checkbox' name='match' value='${part}' class='match-checkbox'>
          ${part}
        </label>
      `).join('<br>');

      // 팝업 HTML 구조 생성
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
            <option value="경기도 > 화성시" ${job.region === "경기도 > 화성시" ? 'selected' : ''}>경기도 > 화성시</option>
            <option value="경기도 > 안성시" ${job.region === "경기도 > 안성시" ? 'selected' : ''}>경기도 > 안성시</option>
            <option value="서울특별시 > 강남구" ${job.region === "서울특별시 > 강남구" ? 'selected' : ''}>서울특별시 > 강
