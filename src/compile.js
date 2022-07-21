import filesystem from "./filesystem.js";
import { bindButton, bindButtons } from "./binder.js";
import { logVerbose } from "./logger.js";
import chalk from "chalk";
import MenuifyError from "./menuifyError.js";

export async function compile(project) {
    logVerbose(`Compiling project ${project.id}`);
    logVerbose(`Loading customFS`);
    let projectfs = new filesystem(project);

    let error = false;
    // compile and bind buttons
    if (project.cascade) {
        let buttons = [];
        project.buttons.forEach(button => {
            button.location = processButtonTriggers(project, button, projectfs);
            buttons.push(button);
        });
        await bindButtons(project, buttons);
    } else if (project.buttons && project.buttons.length > 0) {
        let location = processButtonTriggers(project, project.buttons[0], projectfs);
        await bindButton(project, project.buttons[0], location);
    } else {
        logVerbose(`No buttons found for project ${project.id}`);
        error = "Cannot compile project without buttons";
    }

    if (error) {
        logVerbose(`Error compiling project ${project.id}: ${error}`);
        throw new MenuifyError("The project does not contain any buttons to be processed, aborting.", 1302)
    } else {
        projectfs.saveManifest();
        console.log(chalk.green("Project compiled successfully"));
    }
}

function processButtonTriggers(project, button, projectfs) {
    logVerbose(`Proccessing triggers for button ${button.id}`);
    let absLocation = "";
    if (button.type === "command") {
        // Since this is an executable command, we need to make sure to compile it to a cmd file.
        logVerbose(`Compiling button action for ${button.id}`);
        absLocation = projectfs.writeFile(button.id + ".cmd", compileCommand(button.action));
    }
    return absLocation;
}

export default function compileCommand(command) {
    let script = [];
    script.push("@echo off");
    script.push(":: Generated by Microart Menuify");
    script.push(":: DO NOT EDIT THIS FILE");

    // script setup
    script.push("if exist %1% (");
    script.push("\t:: Menuify variables");
    script.push("\tset filename=%1%");
    script.push("\tset filenameWE=");
    script.push("\tfor %%a in (%filename%) do (@set filenameWE=%%~na)");

    // command to execute
    script.push("\t" + command.replaceAll("{filename}", "%filename%").replaceAll("{filenameWE}", "%filenameWE%"));

    script.push(")");

    return script.join("\n");
}