// form-popup.js
export default function() {
  const popup = document.createElement('div');
  popup.className = 'fixed top-1/2 left-1/2 bg-white p-4 rounded shadow z-50 max-w-sm w-full';
  popup.style.transform = 'translate(-50%, -50%)';

  popup.innerHTML = `
    <div class='text-right'><button onclick='this.parentElement.parentElement.remove()' class='text-sm text-red-500'>✖ 닫기</button></div>
    <form id='new-post-form'>
      <p class='mb-2 text-sm font-semibold'>글 작성하기</p>
      <div class='mb-2'>
        <label class='block text-sm font-medium mb-1'>구분:</label>
        <select name='type' class='border p-1 w-full'>
          <option value='구인'>구인</option>
          <option value='구직'>구직</option>
        </select>
      </div>
      <div id='form-content'></div>
      <div class='mt-4 text-right'>
        <button type='submit' class='bg-blue-600 text-white px-3 py-1 rounded'>등록</button>
      </div>
    </form>`;

  document.body.appendChild(popup);

  const formTypeSelect = popup.querySelector('select[name="type"]');
  const formContent = popup.querySelector('#form-content');
  formTypeSelect.onchange = () => renderFormFields(formContent, formTypeSelect.value);
  renderFormFields(formContent, '구인');

  document.getElementById('new-post-form').onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const type = form.get('type');
    const payload = {
      type,
      team: form.get('team') || '',
      nickname: form.get('nickname') || '',
      age: form.get('age') || '',
      region: form.get('region') || '경기도 > 평택시',
      location: form.get('location') || '',
      fee: form.get('fee') || '',
      contact: form.get('contact') || '',
      intro: form.get('intro') || '',
      password: form.get('password'),
      part: [...form.getAll('part')]
    };
    fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json()).then(result => {
      if (result.success) location.reload();
      else alert('등록 실패: ' + (result.message || '오류'));
    });
  };

  function renderFormFields(container, type) {
  const checklistHTML = [
    '보컬(남)', '보컬(여)', '드럼', '베이스',
    '기타', '키보드', '그 외'
  ].map(part => `<label class='mr-2'><input type='checkbox' name='part' value='${part}' class='mr-1' />${part}</label>`)
    .join(' ');

  const regionSelectHTML = `
    <select required name="region" class="border p-1 w-full mb-2">
      <option value="경기도 > 평택시" selected>경기도 > 평택시</option>
      <option value="경기도 > 오산시">경기도 > 오산시</option>
      <option value="경기도 > 화성시">경기도 > 화성시</option>
      <option value="경기도 > 안성시">경기도 > 안성시</option>
      <option value="서울특별시 > 강남구">서울특별시 > 강남구</option>
      <option value="부산광역시 > 해운대구">부산광역시 > 해운대구</option>
    </select>
  `;

  if (type === '구인') {
    container.innerHTML = `
      <input required name='team' placeholder='밴드명 필수' class='border p-1 w-full mb-2' />
      <input required name='nickname' placeholder='오픈톡 닉네임 필수' class='border p-1 w-full mb-2' />
      <input name='age' placeholder='멤버 연령대' class='border p-1 w-full mb-2' />
      <!-- 파트 선택을 두 줄로 정렬 -->
      <div class='mb-2'>
        <label class='block mb-1'>구인 파트:</label>
        <div class='grid grid-cols-2 gap-4'> <!-- Grid로 두 줄로 배치 -->
          <div><input type='checkbox' name='part' value='보컬(남)' class='mr-1' />보컬(남)</div>
          <div><input type='checkbox' name='part' value='보컬(여)' class='mr-1' />보컬(여)</div>
          <div><input type='checkbox' name='part' value='드럼' class='mr-1' />드럼</div>
          <div><input type='checkbox' name='part' value='베이스' class='mr-1' />베이스</div>
          <div><input type='checkbox' name='part' value='기타' class='mr-1' />기타</div>
          <div><input type='checkbox' name='part' value='키보드' class='mr-1' />키보드</div>
          <div><input type='checkbox' name='part' value='그 외' class='mr-1' />그 외</div>
        </div>
      </div>
      <input required name='location' placeholder='연습실 위치 (필수)' class='border p-1 w-full mb-2' />
      ${regionSelectHTML}
      <input name='fee' placeholder='월 회비 선택' class='border p-1 w-full mb-2' />
      <input required name='contact' placeholder='연락처 필수' class='border p-1 w-full mb-2' />
      <textarea name='intro' placeholder='선호 장르 및 간단한 소개 (100자 이내)' maxlength='100' class='border p-1 w-full mb-2'></textarea>
      <input required name='password' type='password' maxlength='4' placeholder='비밀번호 4자리' class='border p-1 w-full mb-2' />
    `;
  } else {
    container.innerHTML = `
      <input required name='nickname' placeholder='오픈톡 닉네임 (필수)' class='border p-1 w-full mb-2' />
      <div class='mb-2'><label class='block mb-1'>구직 파트:</label>${checklistHTML}</div>
      <input required name='location' placeholder='선호 연습실 위치 (필수)' class='border p-1 w-full mb-2' />
      ${regionSelectHTML}
      <input name='age' placeholder='멤버 연령대' class='border p-1 w-full mb-2' />
      <input required name='contact' placeholder='연락처 (필수)' class='border p-1 w-full mb-2' />
      <textarea name='intro' placeholder='선호 장르 및 간단한 소개 (100자 이내)' maxlength='100' class='border p-1 w-full mb-2'></textarea>
      <input required name='password' type='password' maxlength='4' placeholder='비밀번호 (4자리)' class='border p-1 w-full mb-2' />
    `;
  }
}

