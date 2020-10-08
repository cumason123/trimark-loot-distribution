let api_base_uri = "https://api.eve-echoes-market.com";
let number_of_modules = 0;
let number_of_members = 0;
let hash = 0;
let module_ids = {};
let member_ids = {};

let current_session = {
  total_value: 0,
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
  const node = document.getElementById('member_' + hash);
  node.remove()
  delete current_session.members[hash];
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
  });

  $('#module_cost_' + hash).on('change', function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].cost = parseInt($(this).val().replace(/,/g,''));
  });
}

function addMember() {
  /**
   * Adds an empty member row to website
   */
  const hash = current_session.members.length;

  current_session.members[hash] = {
    name: ''
  }

  const membersContainer = document.getElementById("members");
  const child = document.createElement("div");
  child.setAttribute('id', 'member_' + hash);

  child.innerHTML = `
    <div>
      <input
      id="member_name_${hash}"
      placeholder="e.g. DONTSHOOT"
      class="member"
      type="text"
      />

      <button
      id="member_delete_${hash}"
      class="deleteButton"
      onclick="deleteMember(${hash})">delete</button>
    </div>
  `;
  membersContainer.appendChild(child);

  $('#member_name_' + hash).on('change', function (e) {
    let this_id = $(this).attr('id').split('_');
    let member_id = this_id[this_id.length - 1];

    current_session.members[member_id].name = $(this).val();
  });
}

function give_to(member, item_id, module_name, cost) {
  /**
   * Gives an item to a member and increments the quantity of this
   * item that member has and that members total loot value
   *
   * @param member object that must have attributes module_name and loot_value
   * @param module_name key into member which points to the number of this module member has
   * @param cost number representing the current estimated loot value of this module
   */
  let updated = false;

  for (item in current_session.distribution[member].loot) {
    if (current_session.distribution[member].loot[item].name == module_name) {
      current_session.distribution[member].loot[item].quantity++;
      updated = true;
    }
  }
  if (!updated) {
    let item = {
      item_id: item_id,
      name: module_name,
      quantity: 1,
      cost: cost
    };
    current_session.distribution[member].loot.push(item);
  }
  current_session.distribution[member].loot_value += cost;
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

  let modules = [...current_session.modules];
  current_session.distribution = [];

  // Step 1: sort modules
  modules.sort((module1, module2) => {return (module1.cost > module2.cost ? -1 : 1)});

  for (member_id in current_session.members) {
    // Initialize member loot value to 0
    let distribution = {
      name: current_session.members[member_id].name,
      loot_value: 0,
      loot: []
    }
    current_session.distribution.push(distribution);
  }

  // Iterate through modules
  for (let i = 0; i < modules.length; i++) {
    const { item_id, name, cost, quantity } = modules[i];
    current_session.total_value += (cost * quantity);

    // Iterate through module quantity
    for (let k = 0; k < quantity; k++) {
      // Step 2: Find eligible members
      // Sort members in order of loot value
      current_session.distribution.sort((member1, member2) =>
        member1.loot_value > member2.loot_value ? 1 : -1
      );
      const min_loot_val = current_session.distribution[0].loot_value;

      // Find eligible members
      let eligible_users = [];
      for (let j = 0; j < current_session.distribution.length; j++) {
        const member = j;
        if (current_session.distribution[member].loot_value != min_loot_val) {
          continue;
        }
        eligible_users.push(j);
      }

      // Step 3: tie breaker
      let randomly_chosen_member = random(eligible_users);
      give_to(randomly_chosen_member, item_id, name, cost);
    }
  }

  const result = document.getElementById("result");
  result.innerHTML = displayList();
}

function displayList() {
  /**
   * Styled rendering of the loot distribution
   */
  let output = "";

  output += 'Distribution' + "\n";

  output += "\n";

  for (member in current_session.distribution) {
    output += '- **' + current_session.distribution[member].name + '** - _' + add_commas(current_session.distribution[member].loot_value) + ' ISK_' + "\n";
    for (hash in current_session.distribution[member].loot) {
      output += '  - ' + current_session.distribution[member].loot[hash].name + ' x' + current_session.distribution[member].loot[hash].quantity + "\n";
    }
    output += "\n";
  }
  output += '**Total Value: ' + add_commas(current_session.total_value) + ' ISK**';

  $('#capture').after('<button id="download_button">Download</button>');
  $('#download_button').on('click', () => {
    copy();
  });

  return output;
}

// DEBUGGING
$(document).ready(() => {
  let debugTimer = setInterval(() => {
    $('#debug-output').html('<pre>' + JSON.stringify(current_session, null, 4) + '</pre>');
  }, 2000)
});
