(function () {
  const img = document.getElementById('calib-image');
  const wrap = document.getElementById('calib-wrap');
  const imageInput = document.getElementById('image-input');
  const noImageMsg = document.getElementById('no-image-msg');
  const markerA = document.getElementById('marker-a');
  const markerB = document.getElementById('marker-b');
  const armABtn = document.getElementById('arm-a');
  const armBBtn = document.getElementById('arm-b');

  const xA = document.getElementById('calib1_x');
  const yA = document.getElementById('calib1_y');
  const xB = document.getElementById('calib2_x');
  const yB = document.getElementById('calib2_y');

  let armed = null; // 'a' | 'b' | null

  function showMarkerFromInputs() {
    if (xA.value !== '' && yA.value !== '') {
      markerA.style.left = xA.value + '%';
      markerA.style.top = yA.value + '%';
      markerA.style.display = 'flex';
    }
    if (xB.value !== '' && yB.value !== '') {
      markerB.style.left = xB.value + '%';
      markerB.style.top = yB.value + '%';
      markerB.style.display = 'flex';
    }
  }

  function arm(point) {
    armed = point;
    armABtn.classList.toggle('armed', point === 'a');
    armBBtn.classList.toggle('armed', point === 'b');
    wrap.classList.toggle('armed-cursor', !!point);
  }

  armABtn.addEventListener('click', () => arm(armed === 'a' ? null : 'a'));
  armBBtn.addEventListener('click', () => arm(armed === 'b' ? null : 'b'));

  img.addEventListener('click', (e) => {
    if (!armed) return;
    const rect = img.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.min(100, Math.max(0, xPct));
    const clampedY = Math.min(100, Math.max(0, yPct));

    if (armed === 'a') {
      xA.value = clampedX.toFixed(2);
      yA.value = clampedY.toFixed(2);
      markerA.style.left = clampedX + '%';
      markerA.style.top = clampedY + '%';
      markerA.style.display = 'flex';
    } else if (armed === 'b') {
      xB.value = clampedX.toFixed(2);
      yB.value = clampedY.toFixed(2);
      markerB.style.left = clampedX + '%';
      markerB.style.top = clampedY + '%';
      markerB.style.display = 'flex';
    }
    arm(null);
  });

  if (imageInput) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        img.src = evt.target.result;
        img.style.display = '';
        if (noImageMsg) noImageMsg.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });
  }

  showMarkerFromInputs();
})();
