const player = document.getElementById('player');
const content = document.getElementById('content');
const input = document.getElementById('input');
const submit = document.getElementById('submit');
const messages = document.getElementById('messages');
let value;
let prompt;



document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('bottom-div').style.height = (document.getElementById('bottom').clientHeight) + 'px';
  player.style.display = 'none'
});

user_message = `<div class="flex items-end space-x-2 justify-end">
  <div class="bg-blue-100 p-2 rounded-lg overflow-auto scrollbar-hide">@message</div>
  <img src="user.png" alt="User Avatar" class="w-8 h-8 rounded-full">
</div>`;

system_message = `<div class="flex items-start space-x-2">
  <img src="system.png" alt="System Avatar" class="w-8 h-8 rounded-full">
  <div class="bg-green-100 p-2 rounded-lg overflow-auto scrollbar-hide">@message</div>
</div>`

window.electronAPI.handleQuery((event, text) => {
  content.value = text;
  messages.innerHTML = `${messages.innerHTML}\n${user_message.replace('@message',text)}`;
  event.sender.send('query-text', {prompt:player.value, query: content.value});
})

window.electronAPI.handleTransQuery((event, text) => {
  content.value = text;
  messages.innerHTML = `${messages.innerHTML}\n${user_message.replace('@message',text)}`;
  event.sender.send('query-text',  {prompt:null, query: content.value});
})

window.electronAPI.handleResponse((event, text) => {
  messages.innerHTML = `${messages.innerHTML}\n${system_message.replace('@message',text)}`;
})

window.electronAPI.handleMethod((event, text) => {
  content.value = null;
  switch(text){
    case 'chat':
      player.style.display = 'block';
      break
    case 'translation':
      player.style.display = 'none';
      break
  }
})

window.electronAPI.handlePrompt((event, text) => {
  prompt = text;
  player.value = prompt;
})

window.electronAPI.handleClear(() => {
  player.value = prompt;
  messages.innerHTML = null;
})


window.electronAPI.handleLoad((event, data) => {
  messages.innerHTML = null;
  for (i in data) {
    if (data[i].role == "user") {
      messages.innerHTML = `${messages.innerHTML}\n${user_message.replace('@message',data[i].content)}`;
    } else {
      messages.innerHTML = `${messages.innerHTML}\n${system_message.replace('@message',data[i].content)}`;
    }
  }
})

submit.addEventListener('click', () => {
  window.electronAPI.clickSubmit(input.value);
})