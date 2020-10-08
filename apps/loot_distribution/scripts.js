let api_base_uri = "https://api.eve-echoes-market.com";
let number_of_modules = 0;
let number_of_members = 0;
let hash = 0;
let module_ids = {};
let member_ids = {};

let current_session = {
  members: [],
  modules: [],
  distribution: []
};

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
  if (x === undefined || x === null) {
    // Found empty x
    return ''
  }
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
  $("#module_name_" + hash).select2("destroy");
  const node = document.getElementById('module_' + hash);
  node.remove()
  delete current_session.modules[hash];
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
  const hash = current_session.modules.length;

  current_session.modules[hash] = {
    item_id: 0,
    name: '',
    quantity: 0,
    cost: 0
  }

  const itemsContainer = document.getElementById("modules");
  const child = document.createElement("div");
  child.setAttribute('id', 'module_' + hash);

  child.innerHTML = `
        <div>
            <select
            id="module_name_${hash}"
            class="module">
              <option></option>
            </select>

            <input 
            id="module_quantity_${hash}"
            placeholder="quantity" 
            class="numeric" 
            type="number" 
            />

            <input
            id="module_cost_${hash}"
            placeholder="cost" 
            class="numeric" 
            type="text" 
            />

            <button
            id="module_delete_${hash}"
            class="deleteButton"
            onclick="deleteModule(${hash})">delete</button>
        </div>
    `;
  itemsContainer.appendChild(child);
  $("#module_name_" + hash).select2({
    data: echoes_items,
    placeholder: "e.g. Corpum C-Type Medium Laser",
    allowClear: true,
  });

  $("#module_name_" + hash).on("select2:select", function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].item_id = parseInt(e.params.data.id);
    current_session.modules[module_id].name = e.params.data.text;

    if (current_session.modules[module_id].quantity == 0) {
      current_session.modules[module_id].quantity = 1;
    }
    $("#module_quantity_" + module_id).val(current_session.modules[module_id].quantity);

    let item_id = e.params.data.id;
    $.getJSON(api_base_uri + "/market-stats/" + item_id, function (data) {

      let cost = "sell" in data ? data[data.length - 1].sell : data[data.length - 1].highest_buy;

      $("#module_cost_" + module_id).val(add_commas(cost));
      current_session.modules[module_id].cost = cost;
    });
  });

  $('#module_quantity_' + hash).on('change', function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].quantity = parseInt($(this).val());
  })

  $('#module_cost_' + hash).on('change', function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].cost = parseInt($(this).val().replace(/,/g,''));
  })
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
  current_session.members[hash] = ids;
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
  let modules = current_session.modules;

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
console.log(modules)
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
      output += '  - ' + organized_loot[member][loot].name + ' x' + organized_loot[member][loot] + "\n";
    }
    output += "\n";
  }
  output += '**Total Value: ' + organized_loot.total_value + ' ISK**';

  return output;
}

// DEBUGGING
$(document).ready(() => {
  let debugTimer = setInterval(() => {
    $('#debug-output').html('<pre>' + JSON.stringify(current_session, null, 4) + '</pre>');
  }, 2000)
})