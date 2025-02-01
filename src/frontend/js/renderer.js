document.addEventListener("click", (event) => {
  // 添加链接点击事件监听，用于打开默认浏览器
  if (event.target.tagName === "A") {
    event.preventDefault();
    window.electronAPI.openExternal(event.target.href)
  }

  // 使用Clipboard API进行复制
  if (event.target.classList.contains("copy-btn")) {
    const codeToCopy = decodeURIComponent(event.target.getAttribute('data-code'));
    navigator.clipboard.writeText(codeToCopy).then(() => {
      console.log('复制成功');
    }).catch(err => {
      console.error('复制失败', err);
    });
  }

  return event;

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

user_message = `<div class="flex flex-col space-y-4 items-end space-x-2 justify-end" data-role="user" data-id="@id">
  <div class="flex items-start">
    <div class="message overflow-auto scrollbar-hide">@message</div>
    <div class="menu-container">
      <img class="menu user" src="img/user.svg" alt="User Avatar">
    </div>
  </div>
</div>`;

system_message = `<div class="flex flex-col items-start space-x-2 justify-start" data-role="system" data-id="@id">
  <div class="flex items-start">
    <div class="menu-container">
      <img class="menu system" src="img/@icon.svg" alt="System Avatar">
      <div class="menu-item delete-message">
          <svg class="menu-delete" viewBox="0 0 1024 1024">
              <path fill="#ffffff"
                  d="M950.857143 224.304762H799.695238V63.390476H224.304762v160.914286H73.142857v97.523809h87.771429v638.780953h697.295238V321.828571h92.647619v-97.523809zM321.828571 160.914286h385.219048v63.390476H321.828571V160.914286z m438.857143 702.171428H258.438095V321.828571h502.247619v541.257143z">
              </path>
              <path fill="#ffffff"
                  d="M355.961905 438.857143h97.523809v326.704762h-97.523809zM570.514286 438.857143h97.523809v326.704762h-97.523809z">
              </path>
          </svg>
      </div>
    </div>
    <div class="message overflow-auto scrollbar-hide">@message</div>
  </div>
</div>`

function menuEvent(id) {
  const messageSystem = document.querySelectorAll(`[data-id='${id}']`)[1];
  const menuContainer = messageSystem.getElementsByClassName('menu-container')[0];
  const menu = menuContainer.getElementsByClassName("menu")[0];
  const menu_item = menuContainer.getElementsByClassName("menu-item")[0];

  menu_item.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContainer.classList.remove('active');
    delete_message(id);
  })

  menu.addEventListener('mouseenter', () => {
    menuContainer.classList.add('active');
  })

  menuContainer.addEventListener('mouseleave', () => {
    menuContainer.classList.remove('active');
  })
}

// 扩展 String 原型
String.prototype.format = function (params) {
  let htmlString = this.replace(/@(\w+)/g, (match, key) => {
    return typeof params[key] !== 'undefined' ? params[key] : match;
  });
  // 创建一个新的DOMParser实例
  const parser = new DOMParser();
  // 使用DOMParser将HTML字符串解析为DOM文档
  const doc = parser.parseFromString(htmlString, 'text/html');
  // 获取解析后的元素
  const newElement = doc.body.firstChild;
  return newElement;
};

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
  if (text) {
    const tempDiv = document.createElement("div");
    text.split("\n").forEach((line, index, array) => {
      const fragment = document.createElement("div");
      fragment.textContent = line;
      fragment.display = "block"
      tempDiv.appendChild(fragment)
    });
    return tempDiv.innerHTML;
  } else {
    return "";
  }

}

async function delete_message(id, model) {
  let statu = await window.electronAPI.deleteMessage({
    id: id,
    model, model
  });
  if (statu) {
    var elements = document.querySelectorAll(`[data-id="${id}"]`);
    elements.forEach(function (element) {
      element.remove();
    });
  }
}

function response_success(id) {
  // 获取所有类名为 "system" 的元素
  var elements = document.querySelectorAll(`[data-id="${id}"]`);
  elements.forEach(function (element) {
    if (element.getAttribute('data-role') === 'system') {
      element.remove();
    }
  });
}

function getIcon(is_plugin){
  return is_plugin?"api":"ai";
}

window.electronAPI.handleQuery(async (data) => {
  let escapedText;
  if (data.img_url) {
    content.value = input.value;
    escapedText = insertTextWithBreaks(content.value);
    escapedText = `<img src="${data.img_url}" class="img-response" alt=""></img>${escapedText}`;
  } else {
    content.value = data.text;
    escapedText = insertTextWithBreaks(content.value);
  }
  messages.appendChild(user_message.format({
    "id": data.id,
    "message": escapedText
  }));
  messages.appendChild(system_message.format({
    "icon": getIcon(data.is_plugin),
    "id": data.id,
    "message": "思考中..."
  }));
  // 设置滚动位置到div的最低端
  top_div.scrollTop = top_div.scrollHeight;
  let text = await window.electronAPI.queryText({ prompt: player.value, query: content.value, model: data.model, version: data.version, is_plugin: data.is_plugin, img_url: data.img_url, id: data.id });
  if (text) {
    response_success(data.id);
    messages.appendChild(system_message.format({
      "icon": getIcon(data.is_plugin),
      "id": data.id,
      "message": text
    }));
    typesetMath();
    menuEvent(data.id);
  }
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
    let escapedText;
    if (data[i].role == "user") {
      if (typeof data[i].content !== 'string') {
        escapedText = insertTextWithBreaks(data[i].content.find(c => c.type == "text").text);
        escapedText = `<img src="${data[i].content.find(c => c.type == "image_url").image_url.url}" class="img-response" alt=""></img>${escapedText}`;
      } else {
        escapedText = insertTextWithBreaks(data[i].content);
      }
      messages.appendChild(user_message.format({
        "id": data[i].id,
        "message": escapedText
      }));
    } else {
      escapedText = insertTextWithBreaks(data[i].content);
      messages.appendChild(system_message.format({
        "icon": getIcon(false),
        "id": data[i].id,
        "message": escapedText
      }));
      typesetMath();
      menuEvent(data[i].id);
    }
  }
  typesetMath();
})

submit.addEventListener("click", () => {
  window.electronAPI.clickSubmit(input.value);
})