let api_base_uri = "https://api.eve-echoes-market.com";
let number_of_modules = 0;
let number_of_members = 0;
let hash = 0;
let module_ids = {};
let member_ids = {};

function copy() {
  /**
   * Copies capture div and saves image as loot.png
   */
  html2canvas(document.getElementById("capture"), {
    scrollY: -window.scrollY,
  }).then((canvas) => {
    var a = document.createElement("a");
    // toDataURL defaults to png, so we need to request a jpeg, then convert for file download.
    a.href = canvas
      .toDataURL("image/jpeg")
      .replace("image/jpeg", "image/octet-stream");
    a.download = "loot.jpg";
    a.click();
  });
}

function add_commas(x) {
  /**
   * Add commas to a given string
   *
   * @param x number representing the value we want to append commas to
   * @return string. e.g. given number 1000000 this will return 1,000,000 as a string
   */
  var num = x;
  if (typeof x == "number") {
    num = String(x);
  }
  var parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function random(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function deleteModule(hash) {
  /**
   * Delete a module from the website given the module id/hash
   *
   * @param hash string representing the key within module_ids which points
   *     to this module
   */
  number_of_modules -= 1;
  for (key in module_ids[hash]) {
    const node = document.getElementById(module_ids[hash][key]);
    if (key == "module") {
      $("#" + module_ids[hash].module).select2("destroy");
    }
    node.remove();
  }
  delete module_ids[hash];
}

function deleteMember(hash) {
  /**
   * Delete a member from the website given the members id/hash
   *
   * @param hash string representing the key within member_ids which points
   *     to this member
   */
  number_of_members -= 1;
  for (key in member_ids[hash]) {
    const node = document.getElementById(member_ids[hash][key]);
    node.remove();
  }
  delete member_ids[hash];
}

function addModule() {
  /**
   * Adds an empty module row to website
   */
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
            <select
            id="${ids.module}"
            class="module">
              <option></option>
            </select>

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
  $("#" + ids.module).select2({
    data: echoes_items,
    placeholder: "e.g. Corpum C-Type Medium Laser",
    allowClear: true,
  });

  $("#" + ids.module).on("select2:select", function (e) {
    $("#" + ids.quantity).val(1);
    let item_id = e.params.data.id;
    $.getJSON(api_base_uri + "/market-stats/" + item_id, function (data) {
      let cost = data[data.length - 1].sell;
      $("#" + ids.cost).val(add_commas(cost));
    });
  });
  number_of_modules += 1;
}

function addMember() {
  /**
   * Adds an empty member row to website
   */
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
  /**
   * Gives an item to a member and increments the quantity of this
   * item that member has and that members total loot value
   *
   * @param member object that must have attributes module_name and loot_value
   * @param module_name key into member which points to the number of this module member has
   * @param cost number representing the current estimated loot value of this module
   */
  if (module_name in member) {
    member[module_name] += 1;
  } else {
    member[module_name] = 1;
  }
  member.loot_value += cost;
}

function calculate_distribution() {
  /**
   * Scans through all modules and evenly distributes the modules to all users based on
   * module isk value and renders it on the website.
   *
   * ALGORITHM:
   * First: Sort modules in order of value (e.g. most expensive first).
   * Second: Determine who are the next eligible member(s) to receive a module.
   *     Members are eligible to receive a module if they either have the least
   *     total loot_value, or they are tied with members who currently have the least
   *     total loot_value.
   * Third: Give one module to eligible member. If there are more than one eligible members,
   *     then randomly select an eligible member to hand module to. We then repeat step 2.
   */

  let loot = [];
  let total_value = 0;
  let modules = [];

  for (hash in module_ids) {
    // Find module
    const module_id = module_ids[hash];
    let module_selection = $("#" + module_id.module).select2("data");

    // Get module data
    const module_name = module_selection[0].text;
    const quantity = parseInt(
      document.getElementById(module_id.quantity).value
    );
    const cost = parseFloat(
      document.getElementById(module_id.cost).value.replaceAll(",", "")
    );

    // add module to array
    modules.push({ module_name, quantity, cost });
  }

  // Step 1: sort modules
  modules.sort((module1, module2) => (module1.cost > module2.cost ? -1 : 1));

  for (hash in member_ids) {
    // Find member
    const member_id = member_ids[hash];
    const member_name = document.getElementById(member_id.member).value;

    // Initialize member loot value to 0
    if (member_name != "") {
      loot.push({ name: member_name, loot_value: 0 });
    }
  }

  // Iterate through modules
  for (let i = 0; i < modules.length; i++) {
    const { module_name, cost, quantity } = modules[i];

    // Iterate through module quantity
    for (let k = 0; k < quantity; k++) {
      // Step 2: Find eligible members
      // Sort members in order of loot value
      loot.sort((member1, member2) =>
        member1.loot_value > member2.loot_value ? 1 : -1
      );
      const min_loot_val = loot[0].loot_value;

      // Find eligible members
      let eligible_users = [];
      for (let j = 0; j < loot.length; j++) {
        const member = loot[j];
        if (member.loot_value != min_loot_val) {
          break;
        }
        eligible_users.push(j);
      }

      // Step 3: tie breaker
      let randomly_chosen_member = loot[random(eligible_users)];
      give_to(randomly_chosen_member, module_name, cost);
    }
  }

  // Render loot
  let organized_loot = {};
  for (let i = 0; i < loot.length; i++) {
    const name = loot[i].name;
    organized_loot[name] = JSON.parse(JSON.stringify(loot[i]));
    delete organized_loot[name].name;
  }

  for (member in organized_loot) {
    total_value += organized_loot[member].loot_value;
    organized_loot[member].loot_value = add_commas(
      organized_loot[member].loot_value
    );
  }

  organized_loot.total_value = add_commas(total_value);
  const result = document.getElementById("result");
  result.innerHTML = displayList(organized_loot);
  copy();
}

function displayList(organized_loot) {
  /**
   * Styled rendering of the loot distribution
   */
  let output = "";

  output += 'Distribution' + "\n";

  output += "\n";

  for (member in organized_loot) {
    if (member == "total_value") {
      continue;
    }

    output += '- **' + member + '** - _' + organized_loot[member].loot_value + ' ISK_' + "\n";
    for (loot in organized_loot[member]) {
      if (loot == 'loot_value') { continue; }
      output += '  - ' + loot + ' x' + organized_loot[member][loot] + "\n";
    }
    output += "\n";
  }
  output += '**Total Value: ' + organized_loot.total_value + ' ISK**';

  return output;
}
