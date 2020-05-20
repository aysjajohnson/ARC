// this function runs when the page is loaded
$(document).ready(function () {

    // show an alert if user tries to navigate away from this page
    // window.onbeforeunload = function() {
    //     return "You have not completed the experiment.";
    // };

    // add things to detect if height or width are resized
    $('#height').change(function() {
        console.log('action: changed height of output grid to ' +
                    $('#height').val());
        resizeOutputGrid()
    });

    $('#width').change(function() {
        console.log('action: changed width of output grid to ' +
                    $('#width').val());
        resizeOutputGrid()
    });
    
    // automatically load a random task
    // randomTask();
});

// experiment grids
var grids = Array('a699fb00.json', '23581191.json', 'f9012d9b.json', \
    '4258a5f9.json', 'bdad9b1f.json', '8403a5d5.json', '6e19193c.json', \
    '77fdfe62.json', 'd037b0a7.json', '93b581b8.json');


// Internal state.
var CURRENT_INPUT_GRID = new Grid(3, 3);
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIRS = new Array();
var CURRENT_TEST_PAIR_INDEX = 0;
var SELECT_DATA = new Array();
var COPY_PASTE_DATA = new Array();
var taskList = new Array();
// creating a list of tasks in order to tell where we are
$.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + "training", function(tasks) {
    taskList.push(tasks);
});


// creating a variable task to keep track of what the last task was
var prevTask = "None";
var numAttempts = 0;

// Cosmetic.
var EDITION_GRID_HEIGHT = 500;
var EDITION_GRID_WIDTH = 500;
var MAX_CELL_SIZE = 100;

// copy function
function copy_dict() {
    var copy = {};
    Object.assign(copy, dict_template);
    return copy;
}

// Initialize data storage -- list of dictionaries -- whenever a change is made to the grid, update
var dict_template = {output_grid:CURRENT_OUTPUT_GRID, current_tool: "edit", current_color: 0, output_height: 3,
output_width: 3, select_cells: [], select_values: 0, copy: Boolean(false), action: ""};
var data = [copy_dict()];

// Text helpers

function help() {
    alert('The left side is the input, the right side is the output');
    var msg = "Instructions"
    $('#error_display').stop(true, true);
    $('#info_display').stop(true, true);

    $('#error_display').hide();
    $('#info_display').hide();
    $('#help_text').html(msg);
    $('#help_text').show();
    $('#help_text').fadeOut(5000);
}

function resetTask() {
    CURRENT_INPUT_GRID = new Grid(3, 3);
    TEST_PAIRS = new Array();
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#task_preview').html('');
    resetOutputGrid();
}

function refreshEditionGrid(jqGrid, dataGrid) {
    fillJqGridWithData(jqGrid, dataGrid);
    setUpEditionGridListeners(jqGrid);
    fitCellsToContainer(jqGrid, dataGrid.height, dataGrid.width, EDITION_GRID_HEIGHT, EDITION_GRID_HEIGHT);
    initializeSelectable();
}

function syncFromEditionGridToDataGrid() {
    copyJqGridToDataGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function syncFromDataGridToEditionGrid() {
    refreshEditionGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function getSelectedSymbol() {
    selected = $('#symbol_picker .selected-symbol-preview')[0];
    return $(selected).attr('symbol');
}

function setUpEditionGridListeners(jqGrid) {
    jqGrid.find('.cell').click(function(event) {
        cell = $(event.target);
        symbol = getSelectedSymbol();

        mode = $('input[name=tool_switching]:checked').val();
        if (mode == 'floodfill') {
            // If floodfill: fill all connected cells.
            syncFromEditionGridToDataGrid();
            grid = CURRENT_OUTPUT_GRID.grid;
            floodfillFromLocation(grid, cell.attr('x'), cell.attr('y'), symbol);
            syncFromDataGridToEditionGrid();

            // TODO: save action
            console.log('action: flood fill at (' + cell.attr('x') + ', ' + cell.attr('y') + ') with colour ' + symbol);
            dict_template["action"] = "floodfill";
            dict_template["current_tool"] = "floodfill";
            dict_template["select_cells"] = [cell.attr('x'), cell.attr('y')];
            dict_template["current_color"] = symbol;
            dict_template["output_grid"] = CURRENT_OUTPUT_GRID;
            data.push(copy_dict());
            console.log(data)
        }
        else if (mode == 'edit') {
            // Else: fill just this cell.
            setCellSymbol(cell, symbol);

            // TODO: save action
            dict_template["action"] = "edit";
            dict_template["current_tool"] = "edit";
            dict_template["select_cells"] = [cell.attr('x'), cell.attr('y')];
            dict_template["current_color"] = symbol;
            dict_template["output_grid"] = CURRENT_OUTPUT_GRID;
            data.push(copy_dict());
            console.log('action: edit at (' + cell.attr('x') + ', ' + cell.attr('y') + ') with colour ' + symbol);
        }
    });
}

function resizeOutputGrid() {
    // size = $('#output_grid_size').val();
    // size = $('#height').val();
    // size = parseSizeTuple(size);
    // height = size[0];
    // width = size[1];
    height = $('#height').val();
    width = $('#width').val();

    jqGrid = $('#output_grid .edition_grid');
    syncFromEditionGridToDataGrid();
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);
}

function resetColorBlack() {
    symbol_preview = $('#selected_first');
    $('#symbol_picker').find('.symbol_preview').each(function(i, preview) {
        $(preview).removeClass('selected-symbol-preview');
    })
    symbol_preview.addClass('selected-symbol-preview');
}

function resetOutputGrid() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = new Grid(3, 3);
    syncFromDataGridToEditionGrid();

    // resize grid
    jqGrid = $('#output_grid .edition_grid');
    syncFromEditionGridToDataGrid();
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(3, 3, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);

    // set drop down values
    height  = $('#height').val(3).change;
    width = $('#width').val(3).change;

    // TODO: save action
    dict_template["output_height"] = 3;
    dict_template["output_width"] = 3;
    dict_template["action"] = "resetOutputGrid";
    dict_template["current_tool"] = "edit";
    dict_template["select_cells"] = [];
    dict_template["select_values"] = [];
    dict_template["current_color"] = 0;
    dict_template["output_grid"] = CURRENT_OUTPUT_GRID;
    dict_template["copy"] = false;
    data.push(copy_dict());
    console.log('action: reset grid');

    // set color selector back to black
    resetColorBlack();

    // set initial tool to be edit
    document.getElementById("tool_edit").checked = true;
}

function copyFromInput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    // changing this code
    // $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height, CURRENT_OUTPUT_GRID.width);

    // modify grid size values
    $('#height').val(CURRENT_OUTPUT_GRID.height);
    $('#width').val(CURRENT_OUTPUT_GRID.width);

    // TODO: save action
    dict_template["output_height"] = CURRENT_INPUT_GRID.height;
    dict_template["output_width"] = CURRENT_INPUT_GRID.width;
    dict_template["action"] = "copyFromInput";
    dict_template["current_tool"] = "edit";
    dict_template["select_cells"] = [];
    dict_template["select_values"] = [];
    dict_template["output_grid"] = CURRENT_OUTPUT_GRID;
    dict_template["copy"] = false;
    console.log('action: copy from input')
}

function fillPairPreview(pairId, inputGrid, outputGrid) {
    var pairSlot = $('#pair_preview_' + pairId);
    if (!pairSlot.length) {
        // Create HTML for pair.
        pairSlot = $('<div id="pair_preview_' + pairId + '" class="pair_preview" index="' + pairId + '"></div>');
        pairSlot.appendTo('#task_preview');
    }
    var jqInputGrid = pairSlot.find('.input_preview');
    if (!jqInputGrid.length) {
        jqInputGrid = $('<div class="input_preview"></div>');
        // Adding a header to each input/ouput pair in demonstration
        var name = $('<div class="subTextLeft" id="task_header">Train Input ' + (pairId+1) + '</div>');
        var leftGrid = $('<div id = "left_block_' + pairId + '" class="preview_block"></div>');
        leftGrid.appendTo(pairSlot)
        name.appendTo(leftGrid);
        jqInputGrid.appendTo(leftGrid);
    }
    var jqOutputGrid = pairSlot.find('.output_preview');
    if (!jqOutputGrid.length) {
        jqOutputGrid = $('<div class="output_preview"></div>');
        // jqOutputGrid.appendTo(pairSlot);
        var name = $('<div class="subTextRight" id="task_header">Train Output ' + (pairId+1) + '</div>');
        var rightGrid = $('<div id = "right_block_' + pairId + '" class="preview_block"></div>');
        rightGrid.appendTo(pairSlot)
        name.appendTo(rightGrid);
        jqOutputGrid.appendTo(rightGrid);
    }

    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 200, 200);
    fillJqGridWithData(jqOutputGrid, outputGrid);
    fitCellsToContainer(jqOutputGrid, outputGrid.height, outputGrid.width, 200, 200);
}

function loadJSONTask(train, test) {
    resetTask();
    $('#modal_bg').hide();
    $('#error_display').hide();
    $('#info_display').hide();

    for (var i = 0; i < train.length; i++) {
        pair = train[i];
        values = pair['input'];
        input_grid = convertSerializedGridToGridObject(values)
        values = pair['output'];
        output_grid = convertSerializedGridToGridObject(values)
        fillPairPreview(i, input_grid, output_grid);
    }
    for (var i=0; i < test.length; i++) {
        pair = test[i];
        TEST_PAIRS.push(pair);
    }
    values = TEST_PAIRS[0]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#current_test_input_id_display').html('1');
    $('#total_test_input_count_display').html(test.length);

    // set black as the intial selected color
    resetColorBlack();

}

function loadTaskFromFile(e) {
    var file = e.target.files[0];
    if (!file) {
        errorMsg('No file selected');
        return;
    }
    window.prevTask = file["name"];
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;

        try {
            contents = JSON.parse(contents);
            train = contents['train'];
            test = contents['test'];
        } catch (e) {
            errorMsg('Bad file format');
            return;
        }
        loadJSONTask(train, test);
    };
    reader.readAsText(file);
}

// Helper functions for loading different tasks

function findTask() {
   for (i = 0; i < taskList[0].length; i++) {
        if (taskList[0][i]["name"] == prevTask) {
            return i;
        };
    };   
}

function move(tasks, step) {
  index = findTask()
  if (index == 0 && step == -1) {
    errorMsg("No previous grids")
  } 
  if (index + 1 == tasks.length && step == 1) {
    errorMsg("No more grids")
  }
  else {
    var taskNum = index + step;
    var task = tasks[taskNum];
    window.prevTask = task["name"];
    window.numAttempts = 0;
    // displayNumAttempts(numAttempts);
    return task;
  }
}

function verify(task) {
  $.getJSON(task["download_url"], function(json) {
      try {
          train = json['train'];
          test = json['test'];
      } catch (e) {
          errorMsg('Bad file format');
          return;
      }
      loadJSONTask(train, test);
      // $('#load_task_file_input')[0].value = "";
      infoMsg("Loaded task training/" + task["name"]);
      index = findTask()
      $('#current_task').text('Task name: '+ task["name"] + ', ' + index + ' out of 400');
  })
  .error(function(){
    errorMsg('Error loading task');
  });
}

// Loading first, next, previous, and random tasks

function firstTask() {
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
    function(tasks) {
      var task = tasks[0];
      var task_index = 0;
      window.prevTask = task["name"];
      verify(task);
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function nextTask() {
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset,
        function(tasks) {
        var task = move(tasks, 1)
        verify(task);
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function previousTask() {
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
              function(tasks) {  
      var task = move(tasks,-1)
      verify(task)
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function randomTask() {
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset,  
              function(tasks) {
      var task = tasks[Math.floor(Math.random() * tasks.length)];
      prevTask = task["name"];
      window.numAttempts = 0;
      // displayNumAttempts(numAttempts);
      verify(task);
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function nextTestInput() {
    if (TEST_PAIRS.length <= CURRENT_TEST_PAIR_INDEX + 1) {
        errorMsg('No next test input. Pick another file?')
        return
    }
    CURRENT_TEST_PAIR_INDEX += 1;
    values = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    $('#current_test_input_id_display').html(CURRENT_TEST_PAIR_INDEX + 1);
    $('#total_test_input_count_display').html(test.length);
}

function displayNumAttempts(n) {
  // var nAttempts = $('#evaluation_output_editor');
  var nAttempts = $('#num_attempts');
  if (!nAttempts.length) {
    nAttempts = $('<div id="num_attempts">Number of attempts: 1</div>');
    nAttempts.appendTo('#evaluation_output_editor')
  }
  // pairSlot = $('<div id="pair_preview_' + pairId + '" class="pair_preview" index="' + pairId + '"></div>');
  // console.log(`<div id="num_attempts">Number of attempts: ${n}</div>`)
  else {
    nAttempts.html(`Number of attempts: ${n}`);
  }
  // = $('#num_attempts').html(`Number of attempts: ${n}`)
  // var nAttempts = $('<div id="num_attempts">Number of attempts: </div>');
  // nAttempts.appendTo('#evaluation_output_editor');

}

function submitSolution() {
    syncFromEditionGridToDataGrid();
    reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    submitted_output = CURRENT_OUTPUT_GRID.grid;
    if (reference_output.length != submitted_output.length) {
        errorMsg('Wrong solution.');
        numAttempts ++;
        // displayNumAttempts(numAttempts);
        return
    }
    for (var i = 0; i < reference_output.length; i++){
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++){
            if (ref_row[j] != submitted_output[i][j]) {
                errorMsg('Wrong solution.');
                numAttempts ++;
                // displayNumAttempts(numAttempts);
                return
            }
        }

    }
    numAttempts++;
    // displayNumAttempts(numAttempts);
    infoMsg('Correct solution!');
}

function fillTestInput(inputGrid) {
    jqInputGrid = $('#evaluation_input');
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 400, 400);
}

function copyToOutput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    // changing code here
    // $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height,CURRENT_OUTPUT_GRID.width);
}

function initializeSelectable() {
    try {
        $('.selectable_grid').selectable('destroy');
    }
    catch (e) {
    }
    toolMode = $('input[name=tool_switching]:checked').val();
    if (toolMode == 'select') {
        infoMsg('Select some cells and click on a color to fill in, or press C to copy');
        $('.selectable_grid').selectable(
            {
                autoRefresh: false,
                filter: '> .row > .cell',
                start: function(event, ui) {
                    $('.ui-selected').each(function(i, e) {
                        $(e).removeClass('ui-selected');
                    });
                },
                stop: function(event, ui) {
                    // log data that is selected
                    // TODO: figure out how to determine if input or output is selected
                    
                    selected = $('.ui-selected');
                    
                    SELECT_DATA = [];
                    for (var i = 0; i < selected.length; i ++) {
                        x = parseInt($(selected[i]).attr('x'));
                        y = parseInt($(selected[i]).attr('y'));
                        SELECT_DATA.push([x, y]);
                    }
                            
                    console.log('action: selecting cells')
                    dict_template["action"] = "selectingCells";
                    dict_template["current_tool"] = "select";
                    dict_template["select_cells"] = [x,y];
                    dict_template["select_values"] = [];
                    dict_template["output_grid"] = CURRENT_OUTPUT_GRID;
                    dict_template["copy"] = false;
                    console.log(SELECT_DATA)

                }
            }
        );
    }
}

// Initial event binding.

$(document).ready(function () {
    $('#symbol_picker').find('.symbol_preview').click(function(event) {
        symbol_preview = $(event.target);
        $('#symbol_picker').find('.symbol_preview').each(function(i, preview) {
            $(preview).removeClass('selected-symbol-preview');
        })
        symbol_preview.addClass('selected-symbol-preview');
        
        if ((toolMode == 'select') && ($('.edition_grid').find('.ui-selected').length > 0)) {
            $('.edition_grid').find('.ui-selected').each(function(i, cell) {
                symbol = getSelectedSymbol();
                setCellSymbol($(cell), symbol);
            });

            // TODO: save action
            dict_template["action"] = "selected cells changed color to";
            dict_template["current_tool"] = "select";
            dict_template["select_cells"] = [$('.edition_grid').find('.ui-selected')];
            dict_template["current_color"] = symbol;
            dict_template["output_grid"] = CURRENT_OUTPUT_GRID;
            dict_template["copy"] = false;
            console.log('action: selected cells changed colour to ' + symbol);
            console.log(data)
        }
        else {
            // for edit and flood fill modes
            console.log('action: changed color to ' + getSelectedSymbol());
        }
    });

    // set starting colour to be black
    // $('.symbol_preview symbol_0 selected selected-symbol-preview').addClass('selected-symbol-preview');

    $('.edition_grid').each(function(i, jqGrid) {
        setUpEditionGridListeners($(jqGrid));
    });

    $('.load_task').on('change', function(event) {
        loadTaskFromFile(event);
    });

    $('.load_task').on('click', function(event) {
      event.target.value = "";
    });

    $('input[type=radio][name=tool_switching]').change(function() {
        toolMode = $('input[name=tool_switching]:checked').val();
        console.log('action: changed tool to ' + toolMode);
        initializeSelectable();
    });

    $('body').keydown(function(event) {
        // Copy and paste functionality.
        if (event.which == 67) {
            // Press C

            selected = $('.ui-selected');
            if (selected.length == 0) {
                return;
            }

            COPY_PASTE_DATA = [];
            for (var i = 0; i < selected.length; i ++) {
                x = parseInt($(selected[i]).attr('x'));
                y = parseInt($(selected[i]).attr('y'));
                symbol = parseInt($(selected[i]).attr('symbol'));
                COPY_PASTE_DATA.push([x, y, symbol]);
            }
            infoMsg('Cells copied! Select a target cell and press V to paste at location.');

            // TODO: save action
            console.log('action: copied selected cells')
        }
        if (event.which == 86) {
            // Press P
            if (COPY_PASTE_DATA.length == 0) {
                errorMsg('No data to paste.');
                return;
            }
            selected = $('.edition_grid').find('.ui-selected');
            if (selected.length == 0) {
                errorMsg('Select a target cell on the output grid.');
                return;
            }

            jqGrid = $(selected.parent().parent()[0]);

            if (selected.length == 1) {
                targetx = parseInt(selected.attr('x'));
                targety = parseInt(selected.attr('y'));

                xs = new Array();
                ys = new Array();
                symbols = new Array();

                for (var i = 0; i < COPY_PASTE_DATA.length; i ++) {
                    xs.push(COPY_PASTE_DATA[i][0]);
                    ys.push(COPY_PASTE_DATA[i][1]);
                    symbols.push(COPY_PASTE_DATA[i][2]);
                }

                minx = Math.min(...xs);
                miny = Math.min(...ys);
                for (var i = 0; i < xs.length; i ++) {
                    x = xs[i];
                    y = ys[i];
                    symbol = symbols[i];
                    newx = x - minx + targetx;
                    newy = y - miny + targety;
                    res = jqGrid.find('[x="' + newx + '"][y="' + newy + '"] ');
                    if (res.length == 1) {
                        cell = $(res[0]);
                        setCellSymbol(cell, symbol);
                    }
                }

                // TODO: save action
                console.log('action: pasted selected cells')
            } else {
                errorMsg('Can only paste at a specific location; only select *one* cell as paste destination.');
            }
        }
    });
});
