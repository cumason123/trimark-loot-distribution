let api_base_uri = "https://api.eve-echoes-market.com";
let number_of_modules = 0;
let number_of_members = 0;
let hash = 0;
let module_ids = {};
let member_ids = {};

let new_session = {
  total_value: 0,
  members: [],
  modules: [],
  distribution: []
};

let current_session = {...new_session};

let last_session = loadFromStore('current_session');

let user_list = loadFromStore('user_list');
if (!user_list) {
  user_list = [];
}

function download_loot() {
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
  $("#member_name_" + hash).select2("destroy");
  const node = document.getElementById('member_' + hash);
  node.remove()
  delete current_session.members[hash];
}

function addModule(module_data = false) {
  /**
   * Adds an empty module row to website
   */
  const hash = current_session.modules.length;

  if (!module_data) {
    current_session.modules[hash] = {
      item_id: 0,
      name: '',
      quantity: 0,
      cost: 0
    }
  } else {
    current_session.modules[hash] = module_data;
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
            value="${current_session.modules[hash].quantity}" 
            />

            <input
            id="module_cost_${hash}"
            placeholder="cost" 
            class="numeric" 
            type="text" 
            value="${add_commas(current_session.modules[hash].cost)}" 
            />

            <button
            id="module_delete_${hash}"
            class="deleteButton btn btn-secondary my-2 my-sm-0"
            onclick="deleteModule(${hash})">Delete</button>
        </div>
    `;
  itemsContainer.appendChild(child);

  $("#module_name_" + hash).select2({
    theme: 'bootstrap',
    width: '33%',
    data: echoes_items,
    placeholder: "e.g. Corpum C-Type Medium Laser",
    allowClear: true,
    tags: true,
    minimumInputLength: 2,
    matcher: customMatcher
  });
  $("#module_name_" + hash).val(current_session.modules[hash].item_id);
  $("#module_name_" + hash).trigger('change');

  $("#module_name_" + hash).on("select2:select", function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].item_id = parseInt(e.params.data.id);
    current_session.modules[module_id].name = e.params.data.text;

    if (current_session.modules[module_id].quantity == 0) {
      current_session.modules[module_id].quantity = 1;
    }
    $("#module_quantity_" + module_id).val(current_session.modules[module_id].quantity);

    /** 
     * Commented out market API requests for the moment until it gets more reliable.
     */
    // let item_id = e.params.data.id;
    // let fetchMarketData = $.getJSON(api_base_uri + "/market-stats/" + item_id, function (data) {

    //   let cost = "sell" in data ? data[data.length - 1].sell : data[data.length - 1].highest_buy;

    //   $("#module_cost_" + module_id).val(add_commas(cost));
    //   current_session.modules[module_id].cost = cost;

    //   saveToStore('current_session', current_session);
    // });

    // fetchMarketData.fail(() => {
    //   let cost = 0;
    //   $("#module_cost_" + module_id).val(add_commas(cost));
    //   current_session.modules[module_id].cost = cost;

    //   saveToStore('current_session', current_session);
    // });
  });

  $('#module_quantity_' + hash).on('change', function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].quantity = parseInt($(this).val());

    saveToStore('current_session', current_session);
  });

  $('#module_cost_' + hash).on('change', function (e) {
    let this_id = $(this).attr('id').split('_');
    let module_id = this_id[this_id.length - 1];

    current_session.modules[module_id].cost = parseInt($(this).val().replace(/,/g,''));

    saveToStore('current_session', current_session);
  });
}

function addMember(member_data = false) {
  /**
   * Adds an empty member row to website
   */
  const hash = current_session.members.length;

  if (!member_data) {
    current_session.members[hash] = {
      name: ''
    }
  } else {
    current_session.members[hash] = member_data;
  }

  const membersContainer = document.getElementById("members");
  const child = document.createElement("div");
  child.setAttribute('id', 'member_' + hash);

  child.innerHTML = `
    <div>
      <select
      id="member_name_${hash}"
      class="member">
        <option></option>
      </select>

      <button
      id="member_delete_${hash}"
      class="deleteButton btn btn-secondary my-2 my-sm-0"
      onclick="deleteMember(${hash})">Delete</button>
    </div>
  `;
  membersContainer.appendChild(child);

  $("#member_name_" + hash).select2({
    theme: 'bootstrap',
    width: '33%',
    data: user_list,
    placeholder: "e.g. DONTSHOOT",
    allowClear: true,
    tags: true
  });
  $("#member_name_" + hash).val(current_session.members[hash].name);
  $("#member_name_" + hash).trigger('change');

  $("#member_name_" + hash).on("select2:select", function (e) {
    let this_id = $(this).attr('id').split('_');
    let member_id = this_id[this_id.length - 1];

    current_session.members[member_id].name = e.params.data.text;

    let user_exists = false;
    for (user in user_list) {
      if (user_list[user].text == current_session.members[member_id].name) {
        user_exists = true;
      }
    }
    if (!user_exists && current_session.members[member_id].name != '') {
      user_list.push({
        id: current_session.members[member_id].name,
        text: current_session.members[member_id].name
      });
      saveToStore('user_list', user_list);
    }

    saveToStore('current_session', current_session);
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
function calculate_distribution() {
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

  current_session.total_value = 0;
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

  saveToStore('current_session', current_session);
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

  return output;
}

// DEBUGGING
$(document).ready(() => {
  //let debugTimer = setInterval(() => {
  //  $('#debug-output').html('<pre>' + JSON.stringify(current_session, null, 4) + '</pre>');
  //}, 2000)
});

function saveToStore(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function loadFromStore(key) {
  let stored_data = localStorage.getItem(key);
  if (stored_data != null && typeof stored_data != 'undefined') {
    return JSON.parse(stored_data);
  } else {
    return false;
  }
}

function loadSession() {
  if(confirm('This will replace any changes you\'ve made during this session. Would you like to continue loading your previous session?')) {
    if (!last_session) {
      return false;
    }

    $('#modules').html('');
    $('#members').html('');
    $('#result').html('');

    for (loot_module in last_session.modules) {
      if (last_session.modules[loot_module] != null) {
        addModule(last_session.modules[loot_module]);
      }
    }

    for (loot_member in last_session.members) {
      if (last_session.members[loot_member] != null) {
        addMember(last_session.members[loot_member]);
      }
    }
  }
}

function clearSession() {
  if(confirm('This will destroy any changes you\'ve made during this session. Would you like to continue clearing this session?')) {
    current_session.total_value = 0;
    current_session.members = [];
    current_session.modules = [];
    current_session.distribution = [];

    $('#modules').html('');
    $('#members').html('');
    $('#result').html('');
  }
}

function customMatcher(params, data) {
  if ($.trim(params.term) === '') {
    return data;
  }

  if (typeof data.text === 'undefined') {
    return null;
  }

  let words = params.term.split(' ');
  for (word in words) {
    if (data.text.indexOf(words[word]) > -1) {
      var modifiedData = $.extend({}, data, true);
      //modifiedData.text += ' (matched)';

      // You can return modified objects from here
      // This includes matching the `children` how you want in nested data sets
      return modifiedData;
    }
  }

  return null;
}
