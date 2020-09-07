let number_of_modules = 0;
let number_of_members = 0;
let hash = 0;
let module_ids = {};
let member_ids = {};

function random(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function deleteModule(hash) {
  number_of_modules -= 1;
  for (key in module_ids[hash]) {
    const node = document.getElementById(module_ids[hash][key]);
    node.remove();
  }
  delete module_ids[hash];
}

function deleteMember(hash) {
  number_of_members -= 1;
  for (key in member_ids[hash]) {
    const node = document.getElementById(member_ids[hash][key]);
    node.remove();
  }
  delete member_ids[hash];
}

function addModule() {
  hash = parseInt(hash) + 1;

  const itemsContainer = document.getElementById("modules");
  const child = document.createElement("div");
  const ids = {
    quantity: `quantity_${hash}`,
    cost: `cost_${hash}`,
    module: `module_${hash}`,
    deleteButton: `delete_module_${hash}`,
  };
  module_ids[hash] = ids;

  child.innerHTML = `
        <div>
            <input
            placeholder="e.g. Corpum C-Type Medium Laser"
            id="${ids.module}"
            class="module"
            type="text"
            />

            <input 
            id="${ids.quantity}"
            placeholder="quantity" 
            class="numeric" 
            type="number" 
            />

            <input
            id="${ids.cost}"
            placeholder="cost" 
            class="numeric" 
            type="text" 
            />

            <button
            id="${ids.deleteButton}"
            class="deleteButton"
            onclick="deleteModule(${hash})">delete</button>
        </div>
    `;
  itemsContainer.appendChild(child);
  number_of_modules += 1;
}

function addMember() {
  hash = parseInt(hash) + 1;

  const membersContainer = document.getElementById("members");
  const child = document.createElement("div");
  const ids = {
    member: `member_${hash}`,
    deleteButton: `delete_member_${hash}`,
  };
  member_ids[hash] = ids;
  child.innerHTML = `
    <div>
      <input
      id="${ids.member}"
      placeholder="e.g. DONTSHOOT"
      class="member"
      type="text"
      />

      <button
      id="${ids.deleteButton}"
      class="deleteButton"
      onclick="deleteMember(${hash})">delete</button>
    </div>
  `;
  membersContainer.appendChild(child);
  number_of_members += 1;
}

function give_to(member, module_name, cost) {
  if (module_name in member) {
    member[module_name] += 1;
  } else {
    member[module_name] = 1;
  }
  member.loot_value += cost;
}

function calculate_distribution() {
  let loot = [];
  let modules = [];
  for (hash in module_ids) {
    const module_id = module_ids[hash];
    console.log("README", hash, module_ids, module_id);
    const module_name = document.getElementById(module_id.module).value;
    const quantity = parseInt(
      document.getElementById(module_id.quantity).value
    );
    const cost = parseFloat(
      document.getElementById(module_id.cost).value.replaceAll(",", "")
    );

    modules.push({ module_name, quantity, cost });
  }
  modules.sort((module1, module2) => (module1.cost > module2.cost ? -1 : 1));
  // Generate loot
  for (hash in member_ids) {
    const member_id = member_ids[hash];
    const member_name = document.getElementById(member_id.member).value;
    loot.push({ name: member_name, loot_value: 0 });
  }

  for (let i = 0; i < modules.length; i++) {
    const { module_name, cost, quantity } = modules[i];
    for (let k = 0; k < quantity; k++) {
      loot.sort((member1, member2) =>
        member1.loot_value > member2.loot_value ? 1 : -1
      );
      const min_loot_val = loot[0].loot_value;

      // Find smallest loot values
      let eligible_users = [];
      for (let j = 0; j < loot.length; j++) {
        const member = loot[j];
        if (member.loot_value != min_loot_val) {
          break;
        }
        eligible_users.push(j);
      }
      let randomly_chosen_member = loot[random(eligible_users)];
      give_to(randomly_chosen_member, module_name, cost);
    }
  }

  let organized_loot = {};
  for (let i = 0; i < loot.length; i++) {
    const name = loot[i].name;
    organized_loot[name] = loot[i];
    delete organized_loot[name].name;
  }
  const result = document.getElementById("result");
  result.innerHTML = JSON.stringify(organized_loot, null, 4);
}
