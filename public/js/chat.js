const socket = io();

//Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector("#sidebar");

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const $sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//Options- read user input
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true
});

const autoscroll = () => {
  const $newMessage = $messages.lastElementChild;
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  const visibleHeight = $messages.offsetHeight;

  const containerHeight = $messages.scrollHeight;

  //How far have I scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", message => {
  let className = "message";
  if (username === message.username) {
    className += " sendByMe";
  }
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createAt: moment(message.createAt).format("lll"),
    className
  });

  $messages.insertAdjacentHTML("beforeend", html);

  autoscroll();
});

socket.on("locationMessage", location => {
  let className = "message";
  if (username === location.username) {
    className += " sendByMe";
  }
  const html = Mustache.render(locationTemplate, {
    username: location.username,
    url: location.url,
    createAt: moment(location.createAt).format("lll"),
    className
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render($sidebarTemplate, {
    room,
    users
  });
  $sidebar.innerHTML = html;
});

$messageForm.addEventListener("submit", e => {
  e.preventDefault();
  $messageFormButton.setAttribute("disabled", "disabled");

  const message = e.target.elements.message.value; //document.querySelector("input").value;
  socket.emit("sendMessage", message, error => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("The message was delivered!");
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Not support!");
  }

  $sendLocationButton.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition(position => {
    // console.log(position);
    const location = {
      lat: position.coords.latitude,
      long: position.coords.longitude
    };
    socket.emit("sendLocation", location, acknowledgment => {
      console.log(acknowledgment);
    });
    $sendLocationButton.removeAttribute("disabled");
  });
});

socket.emit("join", { username, room }, error => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
