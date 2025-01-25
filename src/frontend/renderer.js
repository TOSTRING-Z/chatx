// 添加链接点击事件监听，用于打开默认浏览器
document.addEventListener("click", (event) => {
  console.log(event)
  if (event.target.tagName === "A") {
    event.preventDefault();
    window.electronAPI.openExternal(event.target.href)
  }
});

const player = document.getElementById("player");
const content = document.getElementById("content");
const input = document.getElementById("input");
const submit = document.getElementById("submit");
const messages = document.getElementById("messages");
const top_div = document.getElementById("top_div");
const bottom_div = document.getElementById("bottom_div");

const input_h = input.clientHeight;

function autoResizeTextarea(textarea) {
  textarea.style.height = null;
  const inputHeight = Math.min(textarea.scrollHeight, input_h * 3);
  textarea.style.height = inputHeight + "px";
  top_div.style.height = window.innerHeight - bottom_div.clientHeight + "px"
}

function init_size() {
  player.style.height = input_h + "px";
  input.style.height = input_h + "px";
  top_div.style.height = window.innerHeight - bottom_div.clientHeight + "px";
}

document.addEventListener("DOMContentLoaded", function () {

  autoResizeTextarea(input);

  // 监听输入事件，自动调整高度
  [input, player].forEach(textarea => {
    textarea.addEventListener("input", function () {
      autoResizeTextarea(textarea);
      if (this.value.trim() !== '') {
        submit.classList.add('success');
      } else {
        submit.classList.remove('success');
      }
    });
    textarea.addEventListener("click", function () {
      autoResizeTextarea(textarea);
    })
  });

  top_div.addEventListener("click", function () {
    console.log("top_div");
    init_size();
  })

  // 添加事件监听器，监听窗口的resize事件
  window.addEventListener("resize", function () {
    init_size();
  });
});

let prompt;

MathJax = {
  tex: {
    displayMath: [["[", "]"], ["\\[", "\\]"]],
    inlineMath: [["(", ")"], ["\\(", "\\)"]]
  },
  options: {
    // 其他选项
  }
}

var typesetMath = function () { };

user_message = `<div class="flex items-end space-x-2 justify-end">
  <div class="message user overflow-auto scrollbar-hide">@message</div>
  <img src="img/user.png" alt="User Avatar" class="w-8 h-8 rounded-full">
</div>`;

system_message = `<div class="flex items-start space-x-2 justify-start @system">
  <img src="img/system.png" alt="System Avatar" class="w-8 h-8 rounded-full">
  <div class="message overflow-auto scrollbar-hide">@message</div>
</div>`

window.electronAPI.handleMathFormat((math_statu) => {
  if (math_statu) {
    typesetMath = function () {
      MathJax.typesetPromise().catch((err) => console.log(err));
    }
    typesetMath();
  }
  else {
    typesetMath = function () { }
  }
})

function insertTextWithBreaks(text) {
  const tempDiv = document.createElement("div");
  text.split("\n").forEach((line, index, array) => {
    const fragment = document.createElement("div");
    fragment.textContent = line;
    fragment.display = "block"
    tempDiv.appendChild(fragment)
  });
  return tempDiv.innerHTML
}

function response_success() {
  // 获取所有类名为 "system" 的元素
  var elements = document.getElementsByClassName("system");
  // 检查是否有元素存在
  if (elements.length > 0) {
    // 获取最后一个元素
    var lastElement = elements[0];
    // 获取最后一个元素的父元素
    var parent = lastElement.parentNode;
    // 从父元素中移除最后一个元素
    parent.removeChild(lastElement);
  }
}

window.electronAPI.handleQuery((data) => {
  content.value = data.text;
  const escapedText = insertTextWithBreaks(data.text);
  messages.innerHTML = `${messages.innerHTML}\n${user_message.replace("@message", () => escapedText)}`;
  messages.innerHTML = `${messages.innerHTML}\n${system_message.replace("@system", "system").replace("@message", "思考中...")}`;
  // 设置滚动位置到div的最低端
  top_div.scrollTop = top_div.scrollHeight;
  window.electronAPI.queryText({ prompt: player.value, query: content.value, model: data.model, version: data.version, is_plugin: data.is_plugin });
  typesetMath();
})

window.electronAPI.handleResponse((text) => {
  response_success();
  messages.innerHTML = `${messages.innerHTML}\n${system_message.replace("@message", () => text)}`;
  typesetMath();
})

window.electronAPI.handleModel((data) => {
  content.value = null;
  if (data.is_plugin) {
    player.style.display = "none";
    init_size();
  }
  else {
    player.style.display = "block";
    init_size();
  }
})

window.electronAPI.handlePrompt((text) => {
  prompt = text;
  player.value = prompt;
})

window.electronAPI.handleClear(() => {
  player.value = prompt;
  messages.innerHTML = null;
})


window.electronAPI.handleLoad((data) => {
  messages.innerHTML = null;
  for (i in data) {
    if (data[i].role == "user") {
      const escapedText = insertTextWithBreaks(data[i].content);
      messages.innerHTML = `${messages.innerHTML}\n${user_message.replace("@message", () => escapedText)}`;
    } else {
      messages.innerHTML = `${messages.innerHTML}\n${system_message.replace("@message", () => data[i].content)}`;
    }
  }
  typesetMath();
})

submit.addEventListener("click", () => {
  window.electronAPI.clickSubmit(input.value);
})