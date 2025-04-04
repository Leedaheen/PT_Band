export default function openMatchPopup(index) {
  const pw = prompt("비밀번호를 입력하세요");
  if (!pw) return;
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
    const partOptions = parts.map(part => `<label><input type='checkbox' name='match' value='${part}' ${job.matched_parts[part] ? 'checked' : ''}> ${part}</label>`).join('<br>');

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
          <option value="서울특별시 > 강남구" ${job.region === "서울특별시 > 강남구" ? 'selected' : ''}>서울특별시 > 강남구</option>
          <option value="부산광역시 > 해운대구" ${job.region === "부산광역시 > 해운대구" ? 'selected' : ''}>부산광역시 > 해운대구</option>
        </select>
        <label class='block mb-2'><input type='checkbox' name='pinned' value='true' ${ job.pinned ? "checked" : "" } /> 상단 고정</label>
        <textarea name='intro' placeholder='소개글' maxlength='100' class='border p-1 w-full mb-2'>${job.intro || ''}</textarea>
        <p class='mb-1 text-sm'>✅ 매칭 완료할 파트를 선택하세요:</p>
        ${partOptions}
        <div class='mt-3'>
          <button type='submit' class='bg-green-600 text-white px-3 py-1 rounded'>저장</button>
        </div>
      </form>
    `;

    document.body.appendChild(popup);

    document.getElementById('match-form').onsubmit = (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const updated = {
        team: form.get('team'),
        location: form.get('location'),
        type: form.get('type'),
        age: form.get('age'),
        region: form.get('region'),
        intro: form.get('intro'),
        password: pw,
        parts: [...e.target.querySelectorAll('input[name="match"]:checked')].map(i => i.value),
        pinned: form.get('pinned') === 'true'
      };
      fetch(`/update/${index}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      .then(res => res.json())
      .then(resp => {
        if (resp.success) location.reload();
        else alert("저장 실패: " + (resp.message || "오류"));
      });
    };
  });
}
