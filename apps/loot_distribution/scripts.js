const loot = {};
let number_of_modules = 0;
let number_of_members = 0;

function addModule() {
  const itemsContainer = document.getElementById("modules");

  itemsContainer.innerHTML += `
        <div>
            <input
            placeholder="e.g. Corpum C-Type Medium Laser"
            id="module_${number_of_modules}"
            class="module"
            type="text"
            />

            <input 
            id="quantity_${number_of_modules}"
            placeholder="quantity" 
            class="numeric" 
            type="number" 
            />

            <input
            id="cost_${number_of_modules}"
            placeholder="cost" 
            class="numeric" 
            type="number" 
            />

        </div>
    `;
    number_of_modules += 1;
}

function addMember() {
  const membersContainer = document.getElementById("members");
  membersContainer.innerHTML += `
        <div>
            <input
            id="member_${number_of_members}"
            placeholder="e.g. DONTSHOOT"
            class="member"
            type="text"
            />
        </div>
    `;
  number_of_members += 1;
}
