// this function runs when the page is loaded
$(document).ready(function () {

    // show an alert if user tries to navigate away from this page
    // window.onbeforeunload = function() {
    //     return "You have not completed the experiment.";
    // };

    // add things to detect if height or width are resized
    $('#height').change(function() {
        // console.log('action: changed height of output grid to ' +
        //            $('#height').val());
        resizeOutputGrid()
        save(action = "changed height");
    });

    $('#width').change(function() {
        // console.log('action: changed width of output grid to ' +
        //            $('#width').val());
        resizeOutputGrid()
        save(action = "changed width");
    });
    
    // automatically load a random task
    // randomTask();
});

// Experiment grids
var grids = Array('a699fb00.json', '23581191.json', 'f9012d9b.json', 
    '4258a5f9.json', 'bdad9b1f.json', '8403a5d5.json', '6e19193c.json', 
    '77fdfe62.json', 'd037b0a7.json', '93b581b8.json');

var tutorial_grid = Array('00d62c1b.json')

var taskList = new Array();
var tutorial_task = new Array();

// Internal state.
var CURRENT_INPUT_GRID = new Grid(3, 3);
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIRS = new Array();
var CURRENT_TEST_PAIR_INDEX = 0;
var SELECT_DATA = new Array();
var COPY_PASTE_DATA = new Array();

// Cosmetic.
var EDITION_GRID_HEIGHT = 500;
var EDITION_GRID_WIDTH = 500;
var MAX_CELL_SIZE = 100;

// shuffle function from stack overflow
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// creating a list of tasks in order to tell where we are
$.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + "training", function(tasks) {
    for (i=0; i<tasks.length; i++) {
        if (grids.includes(tasks[i].name)) {
            taskList.push([tasks[i],i]);
        }
    }
    shuffle(taskList)
});

$.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + "training", function(tasks) {
    for (i=0; i<tasks.length; i++) {
        if (tutorial_grid.includes(tasks[i].name)) {
            tutorial_task.push([tasks[i],i]);
        }
    }
});

// sleep function
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// creating variables to keep track of global information
var prevTask = "None";
var taskName = "";
var numAttempts = 0;
var numActions = 0;
var task_index = 0;
var maxNumAttempts = 3;
var toolBar = document.getElementById('editor_grid_control_btns');

// save function
save_data = new Array();
function save(action = "", select_data = Array(), copy_data = Array(), written_sol=""){
    window.numActions ++;
    save_list = new Array(numActions, action, output_to_string(), selected_tool(), getSelectedSymbol(),get_size(),
        select_data, copy_data, taskName, written_sol);
    save_data.push(save_list);
    console.log(save_data)
}

// querying variables
function selected_tool() {
    mode = $('input[name=tool_switching]:checked').val();
    return(mode);
}

function getSelectedSymbol() {
    selected = $('#symbol_picker .selected-symbol-preview')[0];
    return $(selected).attr('symbol');
}

function get_size() {
    height = $('#height').val();
    width = $('#width').val();
    return Array(height, width);
}

// converting output grid to string
function output_to_string(){
    syncFromEditionGridToDataGrid();
    var stringGrid = "";
    var dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    for (var i = 0; i < dataGrid.length; i++) {
        if (i == dataGrid.length - 1) {
            stringGrid = stringGrid.concat(dataGrid[i].toString())
        }
        else {
            stringGrid = stringGrid.concat(dataGrid[i].toString());
            stringGrid = stringGrid.concat("|");
        }
    }
    return stringGrid;
}

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
            // console.log('action: flood fill at (' + cell.attr('x') + ', ' + cell.attr('y') + ') with colour ' + symbol);
            save(action="floodfill");
        }
        else if (mode == 'edit') {
            // Else: fill just this cell.
            setCellSymbol(cell, symbol);

            // TODO: save action
            // console.log('action: edit at (' + cell.attr('x') + ', ' + cell.attr('y') + ') with colour ' + symbol);
            save(action="edit");
        }
    });
}

function resizeOutputGrid() {
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

    // set color selector back to black
    resetColorBlack();

    // set initial tool to be edit
    document.getElementById("tool_edit").checked = true;

    // TODO: save action
    // console.log('action: reset grid');
    save(action="reset grid")
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
    // console.log('action: copy from input')
    save(action="copy from input")
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

// Used in this experiment

function startTutorial() {
    document.getElementById('modal_bg').style.display = 'none';
    document.getElementById('modal').style.display = 'none';
    document.getElementById('last_page').style.display = 'none';
    document.getElementById('tutorial_bg').style.display = 'block';
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
    function(tasks) {
      var task = tasks[tutorial_task[0][1]];
      verify(task); })
    // document.getElementById('workspace').style.display = 'none';

    // document.getElementById('tutorial').style.display = 'block'
}

function checkUnderstanding() {
    $('html,body').scrollTop(0);
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
      function(tasks) {
      var task = tasks[taskList[0][1]];
      window.taskName = task.name;
      window.prevTask = task["name"];
      verify(task);
    })

    .error(function(){
      errorMsg('Error loading task list');
    });

    document.getElementById('modal_bg').style.display = 'none';
    document.getElementById('modal').style.display = 'none';
    document.getElementById('tutorial_bg').style.display = 'none';
    document.getElementById('check_understanding').style.display = 'block';
}

function evalAnswers() {
    var q1_val = document.querySelector('input[name="y/n"]:checked').value
    var q2 = document.getElementById("attempts_question");
    var q2_val = q2.options[q2.selectedIndex].value;
    var q3 = document.getElementById("tasks_question");
    var q3_val = q3.options[q3.selectedIndex].value;
    if (q1_val == "Yes" || q2_val != 3 || q3_val != 10) {
        console.log(q1_val,q2_val,q3_val)
        // errorMsg('One or more answers were incorrect, please try again');
        // $('incorrect_submission').show()

        $('#incorrect_submission').stop(true, true);
        $('#incorrect_submission').css('visibility', 'visible');
        // $('#incorrect_submission').css("display", "inline");
        $('#incorrect_submission').css("opacity", "1");
        $('#incorrect_submission').animate({opacity: 0}, 5000);

        // $('#incorrect_submission').css('opacity', 1);
        // $('#incorrect_submission').css('display', 'inline');
        // $('#incorrect_submission').css('visibility', 'visible');
        // $('#incorrect_submission').fadeOut(5000);
    }
    else {
        startExperiment()
    }
}

function startExperiment() {

    document.getElementById("submit_solution_btn").setAttribute( "onClick", "javascript: submitSolution();" );
    document.getElementById("submit_description_btn").setAttribute( "onClick", "javascript: nextTask();" ); 
    document.getElementById("submit_description_btn").innerHTML = "Submit";
    document.getElementById('tutorial_bg').style.display = 'block';
    document.getElementById('tutorial_demonstration').style.display = 'none';
    document.getElementById('check_understanding').style.display = 'none';
    document.getElementById("random_task_btn").style.visibility = "hidden";

    document.getElementById('write_solution_box').value = " ";
    document.getElementById('write_solution').style.display = 'none';
    document.getElementById('submit_solution_btn').style.display = 'block';
    document.getElementById('editor_grid_control_btns').style.display = 'block';
    window.numAttempts = 0;

}


function nextTask() {
    sleep(1000).then(() => {
        var writtenSolution = document.getElementById("write_solution_box").value;
        if (writtenSolution == " ") {
            errorMsg('Nothing to submit')
        }
        else {
            save(action="write solution", select_data = Array(), copy_data = Array(), written_sol=writtenSolution);
            document.getElementById('write_solution_box').value = " ";
            document.getElementById('write_solution').style.display = 'none';
            document.getElementById('submit_solution_btn').style.display = 'block';
            document.getElementById('editor_grid_control_btns').style.display = 'block';
            window.numAttempts = 0;
            var subset = "training";
            if (task_index == 9) {
                document.getElementById('last_page').style.display = 'block';
                document.getElementById('tutorial_bg').style.display = 'none';
            }

            $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset,
                function(tasks) {
                window.task_index ++; 
                var task = tasks[taskList[task_index][1]];
                verify(task);
            })
            .error(function(){
              errorMsg('Error loading task list');
            });

            
        }
    })   
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
      // infoMsg("Loaded task training/" + task["name"]);
      $('#current_task span').html('<strong>Task</strong>: ' + (task_index + 1) + ' / 10' + ', ' + '<strong>Number of attempts</strong>: ' + numAttempts + ' / ' + maxNumAttempts);
      window.taskName = task.name;
  })
  .error(function(){
    errorMsg('Error loading task');
  });
}

function displayInfoBar(task_index, numAttempts){
    $('#current_task span').text('Task ' + (task_index + 1) + ' out of 10' + ', ' + 'Number of attempts: ' + numAttempts + '/' + maxNumAttempts);
}

function submitWritten(){
    document.getElementById('write_solution').style.display = 'block';
    document.getElementById('submit_solution_btn').style.display = 'none';
    document.getElementById('editor_grid_control_btns').style.display = 'none';
}

function submitSolution_tutorial() {
    if (window.confirm("Are you ready to submit?")) { 
        syncFromEditionGridToDataGrid();
        reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
        submitted_output = CURRENT_OUTPUT_GRID.grid;
        if (reference_output.length !== submitted_output.length) {
            errorMsg('Wrong solution.');
            // errorMsg('Wrong shape.');
            numAttempts ++;
            if (numAttempts == maxNumAttempts) {
                $('html,body').scrollTop(0);
                document.getElementById('tutorial_bg').innerHTML = 'You made three errors, you cannot do this experiment.';
            }
            displayInfoBar(task_index, numAttempts);
            return
        }

        for (var i = 0; i < reference_output.length; i++){
            ref_row = reference_output[i];
            for (var j = 0; j < ref_row.length; j++){
                if (ref_row[j] !== submitted_output[i][j]) {
                    window.numAttempts ++;
                    if (numAttempts == maxNumAttempts) {
                        $('html,body').scrollTop(0);
                        document.getElementById('tutorial_bg').innerHTML = 'You made three errors, you cannot do this experiment.';
                    }
                    displayInfoBar(task_index, numAttempts);
                    errorMsg('Wrong solution.');
                    // displayNumAttempts(numAttempts);
                    return
                }
            }

        }
        window.numAttempts++;
        submitWritten();
        document.getElementById("submit_solution_btn").setAttribute( "onClick", "javascript: submitSolution();" );
    }
}

function submitSolution() {
    if (window.confirm("Are you ready to submit?")) { 
        save(action="submit")
        syncFromEditionGridToDataGrid();
        reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
        submitted_output = CURRENT_OUTPUT_GRID.grid;
        if (reference_output.length !== submitted_output.length) {
            errorMsg('Wrong solution.');
            // errorMsg('Wrong shape.');
            numAttempts ++;
            if (numAttempts == maxNumAttempts) {
                errorMsg('You made three errors, you will move on to the next task');
                submitWritten();
            }
            displayInfoBar(task_index, numAttempts);
            return
        }

        for (var i = 0; i < reference_output.length; i++){
            ref_row = reference_output[i];
            for (var j = 0; j < ref_row.length; j++){
                if (ref_row[j] !== submitted_output[i][j]) {
                    window.numAttempts ++;
                    if (numAttempts == maxNumAttempts) {
                        errorMsg('You made three errors, you will move on to the next task');
                        submitWritten();
                    }
                    displayInfoBar(task_index, numAttempts);
                    errorMsg('Wrong solution.');
                    // displayNumAttempts(numAttempts);
                    return
                }
            }

        }
        window.numAttempts++;
        // displayNumAttempts(numAttempts);
        infoMsg('Correct solution!');
        submitWritten();
    }
}
    

// function findTask() {
//    for (i = 0; i < taskList[0].length; i++) {
//         if (taskList[0][i]["name"] == prevTask) {
//             return i;
//         };
//     };   
// }

// function move(tasks, step) {
//   index = findTask()
//   if (index == 0 && step == -1) {
//     errorMsg("No previous grids")
//   } 
//   if (index + 1 == tasks.length && step == 1) {
//     errorMsg("No more grids")
//   }
//   else {
//     var taskNum = index + step;
//     var task = tasks[taskNum];
//     window.prevTask = task["name"];
//     window.numAttempts = 0;
//     // displayNumAttempts(numAttempts);
//     return task;
//   }
// }


// Loading first, next, previous, and random tasks

// function firstTask() {
//     var subset = "training";
//     $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
//     function(tasks) {
//       var task = tasks[0];
//       window.prevTask = task["name"];
//       verify(task);
//     })
//     .error(function(){
//       errorMsg('Error loading task list');
//     });
// }



// function previousTask() {
//     var subset = "training";
//     $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
//               function(tasks) {  
//       var task = move(tasks,-1)
//       verify(task)
//     })
//     .error(function(){
//       errorMsg('Error loading task list');
//     });
// }

// function randomTask() {
//     var subset = "training";
//     $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset,  
//               function(tasks) {
//       var task = tasks[Math.floor(Math.random() * tasks.length)];
//       prevTask = task["name"];
//       window.numAttempts = 0;
//       // displayNumAttempts(numAttempts);
//       verify(task);
//     })
//     .error(function(){
//       errorMsg('Error loading task list');
//     });
// }

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
                            
                    // console.log('action: selecting cells')
                    save(action = "selecting cells", select_data = SELECT_DATA);

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
            // console.log('action: selected cells changed colour to ' + symbol);
            save(action = "selected cells change color")
        }
        else {
            // for edit and flood fill modes
            // console.log('action: changed color to ' + getSelectedSymbol());
            save(action = "changed color")
            
        }
    });

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
        // console.log('action: changed tool to ' + toolMode);
        save(action = "changed tool")
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
            // console.log('action: copied selected cells')
            save(action = "copied selected cells", select_data = Array(), copy_data = COPY_PASTE_DATA)
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
                // console.log('action: pasted selected cells')
                save(action = "pasted selected cells")
            } else {
                errorMsg('Can only paste at a specific location; only select *one* cell as paste destination.');
            }
        }
    });
});
