const noti = document.getElementById("noti");
noti.classList.add("hidden");noti.style.display = "none";

export function visibleNoti(content, milisec){
    noti.style.display = "flex";
    noti.innerHTML = content;

    setTimeout(function(){
        noti.style.display = "none";
    }, milisec)
}