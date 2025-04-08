const noti = document.getElementById("noti");
noti.style.display = "none";

export function visibleNoti(content, milisec) {
  noti.style.display = "flex";
  noti.innerHTML = content;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      noti.style.display = "none";
      resolve();
    }, milisec);
  });
}
