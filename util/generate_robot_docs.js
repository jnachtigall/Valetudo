/* eslint-disable */
const fs = require("fs");
const path = require("path");

const Robots = require("../backend/lib/robots");
const Configuration = require("../backend/lib/Configuration");
const ValetudoEventStore = require("valetudo-backend/lib/ValetudoEventStore");

function generateAnchor(str) {
    return str.replace(/[^0-9a-z-A-Z]/g, "").toLowerCase()
}

function generateCapabilityLink(capability) {
    return "[" + capability + "](https://valetudo.cloud/pages/usage/capabilities-overview.html#" + capability + ")";
}

function generateTable(models, tableData) {
    let ret = "## Overview<a id='Overview'></a>\n\nCapability | ";
    ret += models.map((m) => {
        return "<a href='#" + m[1] + "'>" + m[0] + "</a>";
    }).join(" | ");
    ret += "\n----";
    models.forEach(() => {
        ret += " | ----";
    })
    ret += "\n";
    Object.keys(tableData).sort().forEach(capability => {
        ret += generateCapabilityLink(capability);
        models.forEach(m => {
            ret += " | ";
            if (tableData[capability].indexOf(m[0]) !== -1) {
                ret += "<span style=\"color:green;\">Yes</span>";
            } else {
                ret += "<span style=\"color:red\;\">No</span>";
            }
        });
        ret += "\n";
    });

    return ret;
}

process.on("uncaughtException", function(err) {
    if (err.errno === "EADDRINUSE") {
        //lol
    } else {
        console.log(err);
        process.exit(1);
    }
});

/**
 * We're hiding implementations that aren't ready to be used by people casually checking the docs
 * They might never be ready to be used and just exist as a test etc.
 *
 * Don't get your hopes up just because there's an implementation
 *
 * @type {string[]}
 */
const HIDDEN_IMPLEMENTATIONS = [
    "ViomiV7ValetudoRobot",
    "RoborockM1SValetudoRobot",
    "RoborockS6MaxVValetudoRobot",
    "RoborockS7ValetudoRobot",
    "DreameP2149ValetudoRobot",
    "DreameL10SUltraValetudoRobot",
    "DreameL10SProValetudoRobot",
    "DreameX10PlusValetudoRobot",
    "DreameD9ProPlusValetudoRobot",
    "DreameD10SProValetudoRobot",
    "DreameD10SPlusValetudoRobot",
];


const vendors = {};

Object.values(Robots).forEach(robotClass => {
    if (HIDDEN_IMPLEMENTATIONS.includes(robotClass.name)) {
        return;
    }

    const config = new Configuration();
    config.set("embedded", false);
    const eventStore = new ValetudoEventStore();

    try {
        const instance = new robotClass({
            config: config,
            valetudoEventStore: eventStore
        });

        vendors[instance.getManufacturer()] = vendors[instance.getManufacturer()] ? vendors[instance.getManufacturer()] : {};

        vendors[instance.getManufacturer()][instance.constructor.name] = {
            vendorName: instance.getManufacturer(),
            modelName: instance.getModelName(),
            capabilities: Object.keys(instance.capabilities).sort()
        }
    } catch (e) {
        console.error(e);
    }
});

const header = `---
title: Implementation Overview
category: Usage
order: 10
---

# Implementation Overview

This page features an autogenerated overview of all ValetudoRobot implementations including their supported capabilities.<br/>
To find out what those do, check out the [capabilities overview](https://valetudo.cloud/pages/usage/capabilities-overview.html) section of the docs.

You might want to take a look at the [Buying supported robots](https://valetudo.cloud/pages/general/buying-supported-robots.html) and
[Buying supported robots](https://valetudo.cloud/pages/general/supported-robots.html) page instead.

This is just the autogenerated overview. Keep in mind that rooting instructions will differ for each of these **or might not even be available at all**.<br/>
Just because the code would - in theory - support a Robot doesn't necessarily mean that you can simply buy it and put Valetudo on it.<br/>

Again:<br/>
This is just an autogenerated overview based on the codebase at the time of generation.<br/>
Don't take this as "Everything listed here will be 100% available and work all the time".<br/>

`;

const ToC = [
    "## Table of Contents",
    "1. [Overview](#Overview)"
];
const VendorSections = [];

const SummaryTable = {};
const RobotModels = [];

Object.keys(vendors).filter(v => v !== "Valetudo").sort().forEach((vendor, i) => {
    let vendorTocEntry = [
        (i+2) + ". [" + vendor +"](#" + generateAnchor(vendor) + ")"
    ];

    // noinspection JSMismatchedCollectionQueryUpdate
    let vendorSection = [
        "## " + vendor + '<a id="'+generateAnchor(vendor)+'"></a>',
        ""
    ]


    const vendorRobots = vendors[vendor];

    Object.keys(vendorRobots).sort().forEach((robotImplName, i) => {
        const robot = vendorRobots[robotImplName];
        const robotAnchor = generateAnchor(vendor) + "_" + generateAnchor(robot.modelName);

        RobotModels.push([robot.modelName, robotAnchor]);

        vendorTocEntry.push("    " + (i+1) + ". [" + robot.modelName + "](#" + robotAnchor + ")");

        vendorSection.push(
            "### " + robot.modelName + '<a id="'+robotAnchor+'"></a>',
            "",
            "#### This model supports the following capabilities:"
        );

        robot.capabilities.forEach(capability => {
            vendorSection.push("  - " + generateCapabilityLink(capability));
            if (!SummaryTable.hasOwnProperty(capability)) {
                SummaryTable[capability] = [robot.modelName]
            } else {
                SummaryTable[capability].push(robot.modelName);
            }
        });

        vendorSection.push("", "");
    })


    ToC.push(vendorTocEntry.join("\n"));
    VendorSections.push(vendorSection.join("\n"));
});



const page = [
    header,
    ToC.join("\n"),
    "\n<br/>\n",
    generateTable(RobotModels, SummaryTable),
    "\n<br/>\n",
    VendorSections.join("\n"),
    "<br/><br/><br/><br/><br/>",
    "This page has been autogenerated.<br/>",
    "Autogeneration timestamp: " + new Date().toISOString()
]

fs.writeFileSync(path.join(__dirname, "../docs/_pages/usage/implementation-overview.md"), page.join("\n") + "\n")
process.exit(0);
