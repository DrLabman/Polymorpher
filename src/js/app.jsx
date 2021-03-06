"use strict";

import React from "react";

import {Grommet} from "grommet/components/Grommet";
import {Anchor} from "grommet/components/Anchor";
import {Box} from "grommet/components/Box";
import {Button} from "grommet/components/Button";
import {Footer} from "grommet/components/Footer";
import {Grid} from "grommet/components/Grid";
import {Header} from "grommet/components/Header";
import {Heading} from "grommet/components/Heading";
import {Nav} from "grommet/components/Nav";
import {Tabs} from "grommet/components/Tabs";
import {Tab} from "grommet/components/Tab";
import {Text} from "grommet/components/Text";

import {Code} from "grommet-icons/icons/Code";
import {Cube} from "grommet-icons/icons/Cube";
import {Desktop} from "grommet-icons/icons/Desktop";
import {List as ListIcon} from "grommet-icons/icons/List";
import {Table} from "grommet-icons/icons/Table";
import {schemeCategory10} from "d3-scale-chromatic";

import {scanCode} from "./assembler/scanner";
import {tokenise} from "./assembler/tokeniser";
import {parse} from "./assembler/parser";
import {assemble} from "./assembler/assemble";
import {FS} from "./file_store";

import {InstructionLayer, OpCodeLayer} from "./components/instruction_table";
import {About} from "./components/about";
import {Editor} from "./components/editor";
import {Files} from "./components/files";
import {EmulatorDetails} from "./components/emu_details";

import {EMU8086} from "./components/8086emu";

const colourCodes = {};

export function getColor (type) {
    let code = colourCodes[type];
    if (code === undefined) {
        code = Object.keys(colourCodes).length % 10;
        colourCodes[type] = code;
    }
    return schemeCategory10[code];
}

export default function App () {
    const [aboutLayer, showAboutLayer] = React.useState(false);
    const [insLayer, showInsLayer] = React.useState(false);
    const [opcodeLayer, showOpcodeLayer] = React.useState(false);
    const [compLayer, showCompLayer] = React.useState(false);

    const toggle = (layer, value) => {
        switch (layer) {
            case "about":
                showAboutLayer(value);
                break;
            case "ins":
                showInsLayer(value);
                break;
            case "opcode":
                showOpcodeLayer(value);
                break;
            case "comp":
                showCompLayer(value);
                break;
            default:
                return;
        }
        if (window.plausible && window.plausible.q) {
            window.plausible.q.push([layer + "-" + value]);
        }
    }

    const show = (layer) => toggle(layer, true);
    const close = (layer) => toggle(layer, false);

    const [fs] = React.useState(FS());
    const [file, setFile] = React.useState(null);
    const [code, setCode] = React.useState("");
    const [changed, setChanged] = React.useState(false);
    const codeUpdate = (text) => {
        setCode(text);
        setChanged(true);
        fs.setFile(file, text)
            .then(() => setChanged(false));
    };
    const loadFile = (filename, text) => {
        // load new file
        setFile(filename);
        setCode(text);
    }

    const [asmState, setAsmState] = React.useState({
        lexemes: [],
        tokens: [],
        parsed: [],
        assembled: {errors: [], binaryOutput: [], formattedBin: []},
        buffer: [],
        url: ""
    });

    React.useEffect(() => {
        const timeStart = new Date();

        const lexemes = scanCode(code);
        console.log(lexemes);
        const timeScanning = new Date();

        const tokens = tokenise(lexemes);
        console.log(tokens);
        const timeTokenise = new Date();

        const parsed = parse(tokens);
        console.log(parsed);
        const timeParsed = new Date();

        const assembled = assemble(parsed);
        console.log(assembled);
        const timeAssembled = new Date();

        const binary = assembled.binaryOutput.join("");
        const buffer = [];
        for (let i = 0; i < binary.length; i += 8) {
            buffer.push(parseInt(binary.substr(i, 8), 2));
        }
        const blob = new Blob([new Uint8Array(buffer)], {type: "application/binary"});
        const url = URL.createObjectURL(blob);

        setAsmState({
            lexemes,
            tokens,
            parsed,
            assembled,
            buffer,
            url
        });
    }, [code]);

    const {
        lexemes,
        tokens,
        parsed,
        assembled,
        buffer,
        url
    } = asmState;

    const [tabIndex, setTabIndex] = React.useState();
    const tabNames = ["Code", "Tokens", "Parsed", "Binary", "Formatted Binary", "x86 Virtual Machine"];

    const onActive = index => {
        setTabIndex(index);
        if (window.plausible && window.plausible.q) {
            window.plausible.q.push([tabNames[index]]);
        }
    }

    return (
        <Grommet full>
            <InstructionLayer isOpen={insLayer} close={() => close("ins")}/>
            <OpCodeLayer isOpen={opcodeLayer} close={() => close("opcode")}/>
            <About isOpen={aboutLayer} close={() => close("about")}/>
            <EmulatorDetails isOpen={compLayer} close={() => close("comp")}/>

            <Grid
                rows={["auto", "flex"]}
                columns={["auto", "flex"]}
                fill
                areas={[
                    ["header", "header"],
                    ["sidebar", "main"],
                    ["footer", "footer"]
                ]}
            >
                <Box gridArea="header">
                    <Header background="dark-1" gap="medium" pad="xsmall">
                        <Box direction="row" align="center" gap="small">
                            <Cube/>
                            <Heading color="white" size="small">
                                WebAssembler
                            </Heading>
                            <Text>An online x86 assembler</Text>
                        </Box>
                        <Nav direction="row">
                            <Anchor label="About" icon={<Code/>} onClick={() => show("about")}/>
                            <Anchor label="Instructions" icon={<ListIcon/>} onClick={() => show("ins")}/>
                            <Anchor label="Op Codes" icon={<Table/>} onClick={() => show("opcode")}/>
                            <Anchor label="Hardware" icon={<Desktop/>} onClick={() => show("comp")}/>
                        </Nav>
                    </Header>
                </Box>
                <Box gridArea="sidebar" background="light-1">
                    <Files fs={fs} loadFile={loadFile} openFile={file} fileChanged={changed}/>
                </Box>
                <Box gridArea="main" overflow="auto" direction="column">
                    <Tabs flex>
                        <Tab title="Code">
                            <Box pad="small" fill>
                                <Editor value={code} onChange={codeUpdate}/>
                            </Box>
                        </Tab>
                        {/*<Tab title="Lexemes">*/}
                        {/*    <Box pad="medium">*/}
                        {/*        {lexemes.map((token, i) => (<div key={i} style={{color: schemeCategory10[token.type]}}>{token.token}</div>))}*/}
                        {/*    </Box>*/}
                        {/*</Tab>*/}
                        <Tab title="Tokens">
                            <Box pad="medium">
                                {tokens.map((token, i) => (
                                    <div key={i} style={{color: getColor(token.type)}}>{i}: {token.toString() + " " + token.type}</div>
                                ))}
                            </Box>
                        </Tab>
                        <Tab title="Parsed">
                            <Box pad="medium">
                                {parsed.map((statement, i) => (
                                    <div key={i} style={{color: getColor(statement.getType())}}>{i}: {statement.toString() + " " + statement.getType()}</div>
                                ))}
                            </Box>
                        </Tab>
                        <Tab title="Binary">
                            <Box pad="medium">
                                {assembled.errors.map((error, i) => (<div key={"e" + i} style={{color: "red"}}>{error}</div>))}
                                {assembled.binaryOutput.map((binary, i) => (<div key={"b" + i}>{i}: {binary}</div>))}
                                <Button href={url} label="Download Machine Code" download="code.com"/>
                            </Box>
                        </Tab>
                        <Tab title="Formatted Binary">
                            <Box pad="medium">
                                {assembled.errors.map((error, i) => (<div key={"e" + i} style={{color: "red"}}>{error}</div>))}
                                {assembled.formattedBin.map((line, i) => (<div key={"l" + i}>{line}</div>))}
                                <Button href={url} label="Download Machine Code" download="code.com"/>
                            </Box>
                        </Tab>
                        <Tab title="8086 Virtual Machine">
                            <Box pad="medium">
                                <EMU8086 bios={buffer}/>
                            </Box>
                        </Tab>
                    </Tabs>
                </Box>
                <Box gridArea="footer">
                    <Footer background="dark-1">
                        Status: ...
                    </Footer>
                </Box>
            </Grid>
        </Grommet>
    );
}