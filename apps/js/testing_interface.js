// this function runs when the page is loaded
$(document).ready(function () {
    // show an alert if user tries to navigate away from this page
    // window.onbeforeunload = function() {
    //     return "You have not completed the experiment.";
    // };

    // get tutorial task and all tasks for the experiment
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
                tutorialTask.push([tasks[i],i]);
            }
        }
    });

    // set up click functionality for the color change panel
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

            save(action="select_change_color")
        }
        else {
            // for edit and flood fill modes
            save(action="change_color")
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
        initializeSelectable();
        save(action="change_tool");
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
            infoMsg('Copied cells to clipboard, select a single target cell in the Test Output and press V to paste at that location');

            save(action="select_copy")
        }
        if (event.which == 86) {
            // Press V
            if (COPY_PASTE_DATA.length == 0) {
                errorMsg('The clipboard is empty, please select some cells and press C to copy first');
                return;
            }
            selected = $('.edition_grid').find('.ui-selected');
            if (selected.length == 0) {
                errorMsg('Please select a single target cell in the Test Output to paste');
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

                infoMsg("Successfully pasted cells from clipboard!")
                save(action="select_paste", action_x=targetx, action_y=targety)
            } else {
                errorMsg('Can only paste at a specific location; only select *one* cell as paste destination.');
            }
        }
    });
    
    // add things to detect if height or width are resized
    $("#height").change(function() {
        resizeOutputGrid()
        save(action="change_height");
    });

    $("#width").change(function() {
        resizeOutputGrid()
        save(action="change_width");
    });

    // help modal
    var help_modal = document.getElementById("help_modal");
    console.log(help_modal)
     
    // Get the button that opens the modal
    // var btn = document.getElementById("myBtn");
     
    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];
     
    // When the user clicks on the button, open the help_modal 
    // btn.onclick = function() {
    //   help_modal.style.display = "block";
    // }
     
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
      help_modal.style.display = "none";
    }
     
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == help_modal) {
        help_modal.style.display = "none";
      }
    }
    
    // hide other elements of the experiment initially
    $('#tutorial_container').hide();
    $('#tutorial_quiz').hide();
    $('#workspace').hide();
    $('#experiment_finish').hide();
});

// Experiment grids
// var grids = Array("a699fb00.json", "23581191.json", "f9012d9b.json", 
//     "4258a5f9.json", "bdad9b1f.json", "8403a5d5.json", "6e19193c.json", 
//     "77fdfe62.json", "d037b0a7.json", "93b581b8.json");

var grids = Array("1caeab9d.json", "1e0a9b12.json", "1f876c06.json", "1fad071e.json",
                  "3af2c5a8.json", "6c434453.json", "6e82a1ae.json", "7c008303.json",
                  "99b1bc43.json", "f9012d9b.json")

var tutorial_grid = Array("bdad9b1f.json")

var taskList = new Array();
var tutorialTask = new Array();

// Internal state.
var CURRENT_INPUT_GRID = new Grid(3, 3);
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIRS = new Array();
var CURRENT_TEST_PAIR_INDEX = 0;
var SELECT_DATA = new Array();
var COPY_PASTE_DATA = new Array();
var IS_TUTORIAL = true;
var WRITTEN_SOLUTION = "";

// Cosmetic.
var EDITION_GRID_HEIGHT = 400;
var EDITION_GRID_WIDTH = 400;
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

// sleep function
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// creating variables to keep track of global information
var prevTask = "None";
var taskName = "";
var numAttempts = 1;
var numActions = 0;
var taskIndex = 0;
var maxNumAttempts = 3;
var solved = false;
var toolBar = document.getElementById("editor_grid_control_btns");

// save function
save_data = new Array();
function save(action, action_x="", action_y="", select_loc="") {
    window.numActions ++;

    // get current date and time
    var dateTime = new Date().toLocaleString()

    // create object to store info
    save_list = {action: action,
                 action_x: action_x,
                 action_y: action_y,
                 num_actions: numActions,
                 test_output_grid: outputToString(),
                 test_output_size: getOutputSize(),
                 test_input_grid: inputToString(),
                 test_input_size: getInputSize(),
                 selected_tool: getSelectedTool(),
                 selected_symbol: getSelectedSymbol(),
                 selected_data: SELECT_DATA,
                 select_loc: select_loc,
                 copy_paste_data: COPY_PASTE_DATA,
                 task_number: taskIndex,
                 task_name: taskName,
                 attempt_number: numAttempts,
                 solved: solved,
                 written_solution: WRITTEN_SOLUTION,
                 is_tutorial: IS_TUTORIAL,
                 time: dateTime}

    console.log(save_list);    
    save_data.push(save_list);
}

// querying variables
function getSelectedTool() {
    mode = $("input[name=tool_switching]:checked").val();
    return(mode);
}

function getSelectedSymbol() {
    selected = $("#symbol_picker .selected-symbol-preview")[0];
    return $(selected).attr("symbol");
}

function getOutputSize() {
    height = $("#height").val();
    width = $("#width").val();
    return Array(height, width);
}

function getInputSize() {
    height = CURRENT_INPUT_GRID.height;
    width = CURRENT_INPUT_GRID.width;
    return Array(height, width);
}

// converting output grid to string
function outputToString(){
    syncFromEditionGridToDataGrid();
    var stringGrid = "|";
    var dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    for (var i = 0; i < dataGrid.length; i++) {
        if (i == dataGrid.length - 1) {
            stringGrid = stringGrid.concat(dataGrid[i].join(""))
        }
        else {
            stringGrid = stringGrid.concat(dataGrid[i].join(""));
            stringGrid = stringGrid.concat("|");
        }
    }
    stringGrid = stringGrid.concat("|");
    
    return stringGrid;
}

function inputToString(){
    var stringGrid = "|";
    var dataGrid = JSON.parse(JSON.stringify(CURRENT_INPUT_GRID.grid));
    for (var i = 0; i < dataGrid.length; i++) {
        if (i == dataGrid.length - 1) {
            stringGrid = stringGrid.concat(dataGrid[i].join(""))
        }
        else {
            stringGrid = stringGrid.concat(dataGrid[i].join(""));
            stringGrid = stringGrid.concat("|");
        }
    }
    stringGrid = stringGrid.concat("|");
    
    return stringGrid;
}

// Text helpers
function help() {
    alert("The left side is the input, the right side is the output");
    var msg = "Instructions"
    $("#error_display").stop(true, true);
    $("#info_display").stop(true, true);

    $("#error_display").hide();
    $("#info_display").hide();
    $("#help_text").html(msg);
    $("#help_text").show();
    $("#help_text").fadeOut(5000);
}

function resetTask() {
    CURRENT_INPUT_GRID = new Grid(3, 3);
    TEST_PAIRS = new Array();
    CURRENT_TEST_PAIR_INDEX = 0;
    $("#task_preview").html("");
    resetOutputGrid();
}

function refreshEditionGrid(jqGrid, dataGrid) {
    fillJqGridWithData(jqGrid, dataGrid);
    setUpEditionGridListeners(jqGrid);
    fitCellsToContainer(jqGrid, dataGrid.height, dataGrid.width, EDITION_GRID_HEIGHT, EDITION_GRID_HEIGHT);
    initializeSelectable();
}

function syncFromEditionGridToDataGrid() {
    copyJqGridToDataGrid($("#output_grid .edition_grid"), CURRENT_OUTPUT_GRID);
}

function syncFromDataGridToEditionGrid() {
    refreshEditionGrid($("#output_grid .edition_grid"), CURRENT_OUTPUT_GRID);
}

function setUpEditionGridListeners(jqGrid) {
    jqGrid.find(".cell").click(function(event) {
        cell = $(event.target);
        symbol = getSelectedSymbol();

        mode = $("input[name=tool_switching]:checked").val();
        if (mode == "floodfill") {
            // If floodfill: fill all connected cells.
            syncFromEditionGridToDataGrid();
            grid = CURRENT_OUTPUT_GRID.grid;
            floodfillFromLocation(grid, cell.attr("x"), cell.attr("y"), symbol);
            syncFromDataGridToEditionGrid();
            save(action="floodfill", action_x=cell.attr("x"), action_y=cell.attr("y"));
        }
        else if (mode == "edit") {
            if (cell.attr("symbol") != symbol) {
                // only set cell if its not already that color
                setCellSymbol(cell, symbol);
                save(action="edit", action_x=cell.attr("x"), action_y=cell.attr("y"));
            }
        }
    });

    // set up toggle to allow for draggable edit mode
    var isToggle = false;

    // turn draggable mode on when mouse is held down on an output cell
    jqGrid.find(".cell").mousedown(function(event) {
        mode = $("input[name=tool_switching]:checked").val();
        if (mode == "edit") {
            isToggle = true;
        }
    });

    // turn draggable mode off when mouse up is performed (even outside of the grid)
    window.addEventListener('mouseup', function(event){
        mode = $("input[name=tool_switching]:checked").val();
        if (isToggle && mode == "edit") {
            isToggle = false;
        }
    })

    jqGrid.find(".cell").mousemove(function(event) {
        mode = $("input[name=tool_switching]:checked").val();

        if (isToggle && mode == "edit") {
            cell = $(event.target);
            symbol = getSelectedSymbol();

            if (cell.attr("symbol") != symbol) {
                setCellSymbol(cell, symbol);
                save(action="edit", action_x=cell.attr("x"), action_y=cell.attr("y"));
            }
        }
    });
}

function resizeOutputGrid() {
    height = $("#height").val();
    width = $("#width").val();

    jqGrid = $("#output_grid .edition_grid");
    syncFromEditionGridToDataGrid();
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);

    SELECT_DATA = [];
}

function resetColorBlack() {
    symbol_preview = $("#selected_first");
    $("#symbol_picker").find(".symbol_preview").each(function(i, preview) {
        $(preview).removeClass("selected-symbol-preview");
    })
    symbol_preview.addClass("selected-symbol-preview");
}

function resetOutputGrid() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = new Grid(3, 3);
    syncFromDataGridToEditionGrid();

    // resize grid
    jqGrid = $("#output_grid .edition_grid");
    syncFromEditionGridToDataGrid();
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(3, 3, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);

    // set drop down values
    height  = $("#height").val(3).change;
    width = $("#width").val(3).change;

    // set color selector back to black
    resetColorBlack();

    // set initial tool to be edit
    document.getElementById("tool_edit").checked = true;

    // clear clipboard and selected data
    COPY_PASTE_DATA = [];
    SELECT_DATA = [];

    infoMsg("Resetting Test Output grid")
    save(action="reset_grid")
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

    // clear selected data
    SELECT_DATA = [];

    infoMsg("Copied Test Input grid to Test Output")
    save(action="copy_from_input")
}

function solve() {
    // function to automatically solve the task
    reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(reference_output);
    syncFromDataGridToEditionGrid();

    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height, CURRENT_OUTPUT_GRID.width);

    // modify grid size values
    $('#height').val(CURRENT_OUTPUT_GRID.height);
    $('#width').val(CURRENT_OUTPUT_GRID.width);

    save(action="auto_solve")

    if (IS_TUTORIAL) {
        $('#submit_tutorial_solution_btn').click();
        $('#write_solution_box').val("test");
        $('#submit_tutorial_description_btn').click();
    }
    else {
        $('#submit_solution_btn').click();
        $('#write_solution_box').val("test");
        $('#submit_description_btn').click();
    }
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
        var name = $('<div class="subTextLeft" id="task_header">Example Input ' + (pairId+1) + '</div>');
        var leftGrid = $('<div id = "left_block_' + pairId + '" class="preview_block"></div>');
        leftGrid.appendTo(pairSlot)
        name.appendTo(leftGrid);
        jqInputGrid.appendTo(leftGrid);
    }
    var jqOutputGrid = pairSlot.find('.output_preview');
    if (!jqOutputGrid.length) {
        jqOutputGrid = $('<div class="output_preview"></div>');
        // jqOutputGrid.appendTo(pairSlot);
        var name = $('<div class="subTextRight" id="task_header">Example Output ' + (pairId+1) + '</div>');
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
    $("#modal_bg").hide();
    $("#error_display").hide();
    $("#info_display").hide();

    resetTask();
    
    for (var i = 0; i < train.length; i++) {
        pair = train[i];
        values = pair["input"];
        input_grid = convertSerializedGridToGridObject(values)
        values = pair["output"];
        output_grid = convertSerializedGridToGridObject(values)
        fillPairPreview(i, input_grid, output_grid);
    }
    for (var i=0; i < test.length; i++) {
        pair = test[i];
        TEST_PAIRS.push(pair);
    }
    values = TEST_PAIRS[0]["input"];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    CURRENT_TEST_PAIR_INDEX = 0;
    $("#current_test_input_id_display").html("1");
    $("#total_test_input_count_display").html(test.length);
}

function loadNextTask() {
    // reset boolean tracking whether task is solved
    solved = false;

    // load next task
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset,
              function(tasks) {
                  var task = tasks[taskList[taskIndex][1]];
                  verify(task);
                  window.taskIndex ++; 
              })
        .error(function(){
            errorMsg('Error loading task list');
        });
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
function startTutorial() {
    // hide other pages
    $('#model_bg').hide();
    $('#experiment_finish').hide();
    $('#tutorial_container').show();
}

function finishTutorial() {
    sleep(1000).then(() => {
        WRITTEN_SOLUTION = document.getElementById("write_solution_box").value;
        if (WRITTEN_SOLUTION == "") {
            errorMsg('Please describe your solution to this task before pressing the Submit button');
        }
        else {
            save(action="write_tutorial_description");
            resetEditor();
            window.numAttempts = 1;
            tutorialQuiz();
        }
    });
}

function tutorialQuiz() {
    $('#tutorial_container').hide();
    $('#workspace').hide();
    $('#experiment_finish').hide();
    $('#tutorial_quiz').show();
    $('#tutorial_quiz_btn').show();

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
        $('#incorrect_submission').css("opacity", "1");
        $('#incorrect_submission').animate({opacity: 0}, 5000);
    }
    else {
        $('#correct_submission').stop(true, true);
        $('#correct_submission').css('visibility', 'visible');
        $('#correct_submission').css("opacity", "1");
        $('#correct_submission').animate({opacity: 0}, 5000);

        sleep(2000).then(() => {        
            startExperiment();
        })
    }
}

function resetEditor() {
    $('#write_solution').hide();
    $('#write_solution_box').first().val("");
    $('#submit_tutorial_solution_btn').hide();
    $('#submit_tutorial_description_btn').hide();
    $('#submit_solution_btn').show();
    $('#editor_grid_control_btns').show();

    IS_TUTORIAL = false;    
}

function startExperiment() {
    $('#modal_bg').hide();
    $('#tutorial_container').hide();
    $('#tutorial_nav').hide();
    $('#tutorial_quiz').hide();
    $('#experiment_finish').hide();
    $('#workspace').show();
    $('#evaluation-input-view').show();

    if (IS_TUTORIAL) {
        // this occurs when skipping straight to main


    }

    loadNextTask();
    resetEditor();

    window.numAttempts = 1;
}

function nextTask() {
    sleep(1000).then(() => {
        WRITTEN_SOLUTION = document.getElementById("write_solution_box").value;
        if (WRITTEN_SOLUTION == "") {
            errorMsg('Please describe your solution to this task before pressing the Submit button');
        }
        else {
            save(action="write_description");
            resetEditor();
            window.numAttempts = 1;

            // show final page if participant has finished all tasks
            console.log(taskIndex);
            if (taskIndex == 10) {
                finishExperiment();
            }
            else {
                loadNextTask();
            }
        }
    })   
}

function finishExperiment() {
    $('#modal_bg').hide();
    $('#tutorial_container').hide();
    $('#tutorial_nav').hide();
    $('#workspace').hide();
    $('#experiment_finish').show();
}

function submitResults() {
    // TODO: save feedback provided
    // TODO: submit results to Mechanical Turk
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
        window.taskName = task.name; // update task name
        window.numActions = 0; // reset number of actions
        loadJSONTask(train, test);
        updateInfoBar();
    })
        .error(function(){
            errorMsg('Error loading task');
        });
}

function updateInfoBar() {
    if (IS_TUTORIAL) {
        $('#current_task span').html('<strong>Task</strong>: Tutorial Example');
    }
    else {
        $('#current_task span').html('<strong>Task</strong>: ' + (taskIndex) + '/10' + '&nbsp;&nbsp;&nbsp;' + '<strong>Attempt</strong>: ' + numAttempts + '/' + maxNumAttempts);
    }
}

function submitWritten(){
    if (IS_TUTORIAL) {
        $('#submit_solution_btn').hide();
        $('#submit_description_btn').hide();
        $('#submit_tutorial_description_btn').show();
    }
    else {
        $('#submit_tutorial_solution_btn').hide();
        $('#submit_tutorial_description_btn').hide();
        $('#submit_description_btn').show();
    }

    $('#editor_grid_control_btns').hide();
    $('#write_solution').show();

    if (!solved) {
        $('#write_solution_text').text("Unfortunately, you made three unsuccessful attempts at solving this task. Please describe what you thought the rule to transform the input into the output for this task. When you are done, please press the Submit button to continue.")
    }
    else if (IS_TUTORIAL) {
        $('#write_solution_text').text("Congratulations, you solved the tutorial task! In the main experiment, after either solving the task, or three incorrect attempts you will be asked to write a description of your solution in the text box below. Please write out a description for the tutorial task you just completed, and when you are done, please press the Submit button to continue.")

    }
}

function submitTutorial() {
    syncFromEditionGridToDataGrid();
    reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    submitted_output = CURRENT_OUTPUT_GRID.grid;

    // clear any selected cells
    $('.ui-selected').each(function(i, e) {
        $(e).removeClass('ui-selected');
    });

    SELECT_DATA = [];
    
    for (var i = 0; i < reference_output.length; i++) {
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++){
            if (ref_row[j] !== submitted_output[i][j]) {
                save(action="submit_tutorial")
                window.numAttempts ++;
                errorMsg('Your response was incorrect, please try again');
                return
            }
        }
    }

    infoMsg('Your response was correct!')
    solved = true;
    save(action="submit_tutorial")
    submitWritten();
}

function submitSolution() {
    // if (window.confirm("Are you ready to submit?")) { 
    syncFromEditionGridToDataGrid();
    reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    submitted_output = CURRENT_OUTPUT_GRID.grid;

    // clear any selected cells
    $('.ui-selected').each(function(i, e) {
        $(e).removeClass('ui-selected');
    });

    SELECT_DATA = [];

    for (var i = 0; i < reference_output.length; i++) {
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++){
            if (ref_row[j] !== submitted_output[i][j]) {
                save(action="submit")
                window.numAttempts ++;
                console.log(numAttempts);
                if (numAttempts > maxNumAttempts) {
                    // TODO: figure out whether or not to skip submitWritten
                    errorMsg('You made three errors, you will move on to the next task');
                    submitWritten();
                }
                else {
                    updateInfoBar();
                    errorMsg('Your response was incorrect, please try again');
                }
                return
            }
        }
    }

    infoMsg('Your response was correct!');
    solved = true;
    save(action="submit")
    submitWritten();
    // }
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

function fillTestInput(inputGrid) {
    jqInputGrid = $('#evaluation_input');
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 400, 400);
}

function initializeSelectable() {
    try {
        $('.selectable_grid').selectable('destroy');
    }
    catch (e) {
    }
    toolMode = $('input[name=tool_switching]:checked').val();
    if (toolMode == 'select') {
        // infoMsg('Click and drag to select cells on the grid. Click on another color to change the color of all selected cells, or press C to copy the selected cells to the clipboard');
        infoMsg('Switched to Select Tool, click and drag to select cells, then copy by pressing C or change color by clicking new color')
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
                    var select_loc = ""
                    selected = $('.ui-selected');

                    // check if selected is from test input or test output
                    if (selected.parent().parent().parent().attr('id') == 'evaluation-input-view') {
                        select_loc = "test_input"
                    }
                    else if (selected.parent().parent().parent().attr('id') == "output_grid") {
                        select_loc = "test_output"
                    }
                    
                    SELECT_DATA = [];
                    for (var i = 0; i < selected.length; i ++) {
                        x = parseInt($(selected[i]).attr('x'));
                        y = parseInt($(selected[i]).attr('y'));
                        SELECT_DATA.push([x, y]);
                    }
                    
                    save(action="select_cells",
                         action_x=$(selected[0]).attr('x'),
                         action_y=$(selected[0]).attr('y'),
                         select_loc=select_loc);
                }
            }
        );
    }
    else if (toolMode == 'edit') {
        infoMsg("Switched to Edit Tool");
        SELECT_DATA = [];
    }
    else if (toolMode == 'floodfill') {
        infoMsg("Switched to Flood Fill Tool");
        SELECT_DATA = [];
    }
}

// tutorial slideshow code
var slideIndex = 1;

// next/previous controls
function plusSlides(n) {
    showSlides(slideIndex += n);
}

// thumbnail image controls
function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides() {
    $('#modal_bg').hide();
    $('#tutorial_container').show();
    
    var i;
    var n = slideIndex;

    var slides = $('.tutorial_slide');
    var dots = $('.dot');

    if (n < 1) {
        slideIndex = 1 // prevent going past the first slide
    }
    else if (n >= 1 && n <= slides.length) {
        // update active slide
        for (i = 0; i < slides.length; i++) {
            slides[i].style.display = "none"; 
        }

        for (i = 0; i < dots.length; i++) {
            dots[i].className = dots[i].className.replace(" active", "");
        }

        slides[slideIndex-1].style.display = "block"; 
        dots[slideIndex-1].className += " active";
    }
    else if (n > slides.length) {
        // hide slides and start tutorial task
        for (i = 0; i < slides.length; i++) {
            slides[i].style.display = "none"; 
        }
        startTutorialTask();
    } 
}

function startTutorialTask() {
    // go to the tutorial task
    // hide tutorial stuff
    $('#tutorial_container').hide();
    $('#tutorial_nav').hide();
    $('.prev').hide();
    $('.next').hide();
    $('#submit_solution_btn').hide();
        
    // display workspace
    $('#workspace').show();
    var subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, 
              function(tasks) {
                  var task = tasks[tutorialTask[0][1]];
                  verify(task);
              });
}


function showHelpModal() {
    help_modal.style.display = "block";
}

function hideHelpModal() {
    help_modal.style.display = "none"
}

// original code that is no longer needed
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

