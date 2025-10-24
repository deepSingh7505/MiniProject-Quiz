// ${initialque}
const add=document.querySelector(".add");
let initialque=1;
add.addEventListener("click", () => {
    initialque++;
    document.querySelector(".questions").innerHTML=document.querySelector(".questions").innerHTML + `<div class="quiz" id="${initialque-1}">
            <div class="que">
                <p class="para">Question ${initialque}</p>
                <input type="text" class="input" placeholder="Enter Your Question.....">
            </div>
            <div class="ans">
                <p class="para">Answer option</p>
                <div class="options">
                    <input type="text" value="0" class="option-text" placeholder="Enter Option 1">
                    <input type="radio" value="0">
                </div>
                <div class="options">
                    <input type="text" value="1" class="option-text" placeholder="Enter Option 2">
                    <input type="radio" value="1">
                </div>
                <div class="options">
                    <input type="text" value="2" class="option-text" placeholder="Enter Option 3">
                    <input type="radio" value="2">
                </div>
                <div class="options">
                    <input type="text" value="3" class="option-text" placeholder="Enter Option 4">
                    <input type="radio" value="3">
                </div>
            </div>
        </div>`
  });