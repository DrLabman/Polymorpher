"use strict";

import React, {Fragment} from "react";

import {Anchor} from "grommet/components/Anchor";
import {Box} from "grommet/components/Box";
import {Button} from "grommet/components/Button";
import {Heading} from "grommet/components/Heading";
import {Table} from "grommet/components/Table";
import {TableBody} from "grommet/components/TableBody";
import {TableHeader} from "grommet/components/TableHeader";
import {TableRow} from "grommet/components/TableRow";
import {TableCell} from "grommet/components/TableCell";
import {Text} from "grommet/components/Text";
import {TextArea} from "grommet/components/TextArea";

import {Connectivity} from "grommet-icons/icons/Connectivity";
import {FormNext} from "grommet-icons/icons/FormNext";
import {Play} from "grommet-icons/icons/Play";
import {Pause} from "grommet-icons/icons/Pause";

import {Test} from "../8086-emu/8086.asm";


export function EMU8086 (props) {
    const textAreaRef = React.useRef(undefined);

    const [step, setStep] = React.useState(null);
    const [cpu, setCPU] = React.useState(null);
    const [registers, setRegisters] = React.useState(null);
    const [memory, setMemory] = React.useState(null);
    const [bus, setBus] = React.useState(null);
    const [logs, setLogs] = React.useState(null);
    const [errors, setErrors] = React.useState(null);

    const [cpuTimer, setCpuTimer] = React.useState(null);

    const [registerTable, setRegTable] = React.useState([]);
    const [memoryTable, setMemTable] = React.useState([]);
    const [busTable, setBusTable] = React.useState([]);
    const [flagTable, setFlagTable] = React.useState([]);

    const [emuOutput, setEMUOutput] = React.useState([]);

    const bios = props.bios;

    const toHex = (val, len) => {
        len = len || 2;
        let out = (val | 0).toString(16).toUpperCase();

        while ((out.length & (out.length - 1)) !== 0 || out.length < len) {
            out = "0" + out;
        }

        return out;
    }

    React.useEffect(() => {
        if (registers) {
            const regTab = [];

            regTab.push(["Address", registers.getInstructionLocation()]);
            regTab.push(["IP", registers.getInstructionPointer()]);

            Object.keys(registers.seg16)
                .sort()
                .filter((reg) => typeof(registers.seg16[reg]) !== "function" && reg.indexOf("X") === -1)
                .forEach((reg) => {
                    regTab.push([reg, registers.getSegment16Bit(registers.seg16[reg])]);
                });

            Object.keys(registers.reg16)
                .sort()
                .filter((reg) => typeof(registers.reg16[reg]) !== "function" && reg.indexOf("X") === -1)
                .forEach((reg) => {
                    regTab.push([reg, registers.getGeneral16Bit(registers.reg16[reg])]);
                });

            Object.keys(registers.reg16)
                .sort()
                .filter((reg) => typeof(registers.reg16[reg]) !== "function" && reg.indexOf("X") !== -1)
                .forEach((reg) => {
                    regTab.push([reg, registers.getGeneral16Bit(registers.reg16[reg])]);
                });

            regTab.forEach((row) => row[1] = toHex(row[1], 4));

            setRegTable(regTab);

            const flagTab = [];

            const flags = registers.flags;
            const flagVal = registers.getFlags();

            Object.keys(flags)
                .filter((flag) => flag !== "All")
                .forEach((flag) => {
                    flagTab.push([flag, (!!(flagVal & flags[flag])).toString()]);
                })

            setFlagTable(flagTab);
        }
    }, [registers, step]);

    React.useEffect(() => {
        if (bus) {

        }
    }, [bus, step]);

    React.useEffect(() => {
        if (memory && registers) {
            const location = registers.getInstructionLocation();
            const memTab = [];

            for (let i=-4; i<10; i++) {
                const loc = location + i;
                const val = memory.getByte(loc);

                memTab.push([toHex(loc), toHex(val), i===0]);
            }

            setMemTable(memTab);
        }
    }, [registers, memory, step]);

    function reset () {
        try {
            pauseCPU();
            setStep(0);

            const structures = Test(bios);
            setLogs(structures.logs);
            setErrors(structures.errors);

            setCPU(structures.cpu);
            setRegisters(structures.registers);
            setMemory(structures.memory);
            setBus(structures.bus);

            setEMUOutput(["VM Started"]);
        } catch (e) {
            setEMUOutput([e.toString()]);
        }
    }

    function stepCPU () {
        if (cpu) {
            pauseCPU();

            try {
                setStep((prev) => prev + 1);
                cpu.execute();

                const output = [];
                logs.forEach((item) => output.push(item));
                errors.forEach((item) => output.push(item));
                setEMUOutput(output);
            } catch (e) {
                const output = [];
                output. push(e.toString());
                setEMUOutput(output);
            }
        }
    }

    function runCPU (mul) {
        mul = mul || 1;

        if (cpu) {
            pauseCPU();

            stepCPU();
            const timer = setInterval(() => {
                stepCPU();
            }, 1000 / mul);

            setCpuTimer(timer);
        }
    }

    function pauseCPU () {
        if (cpuTimer) {
            setCpuTimer((prev) => {
                clearInterval(prev);
                return null;
            });
        }
    }

    // Ensure we stop the cpu when we leave the page
    React.useEffect(() => {
        return () => {
            pauseCPU();
        }
    }, []);

    React.useEffect(() => {
        if (textAreaRef && textAreaRef.current) {
            const textarea = textAreaRef.current;

            textarea.scrollTop = textarea.scrollHeight;
        }
    }, [emuOutput]);

    return (
        <Fragment>
            <Box direction="row">
                {!cpu && <Button label="Start" onClick={() => reset()}/>}
                {cpu && <Fragment>
                    <Button label="Reset" onClick={() => reset()}/>
                    <Button label="Step" onClick={() => stepCPU()}/>
                    {!cpuTimer && <Fragment>
                        <Button label="Run" onClick={() => runCPU()}/>
                        <Button label="Run x2" onClick={() => runCPU(2)}/>
                        <Button label="Run x4" onClick={() => runCPU(4)}/>
                    </Fragment>}
                    {cpuTimer && <Button label="Pause" onClick={() => pauseCPU()}/>}
                </Fragment>}
                {/*<Text>CPU Step: {step}</Text>*/}
            </Box>
            <Box direction="row" height="large">
                <Box fill>
                    <Heading level="3">History</Heading>
                    <TextArea ref={textAreaRef} value={emuOutput.join("\n")} fill></TextArea>
                </Box>
                <Box width={{ min: 'small' }}>
                    <Heading level="3">Memory</Heading>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Location</TableCell>
                                <TableCell>Value</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {memoryTable.map((row, i) => {
                                return <TableRow key={i}>
                                    <TableCell>{!row[2] ? row[0] : <Box background={{color: "brand"}}>{row[0]}</Box>}</TableCell>
                                    <TableCell>{row[1]}</TableCell>
                                </TableRow>;
                            })}
                        </TableBody>
                    </Table>
                </Box>
                <Box width={{ min: 'small' }}>
                    <Heading level="3">Registers</Heading>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Reg</TableCell>
                                <TableCell>Value</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registerTable.map((row, i) => {
                                return <TableRow key={i}>
                                    <TableCell>{row[0]}</TableCell>
                                    <TableCell>{row[1]}</TableCell>
                                </TableRow>;
                            })}
                        </TableBody>
                    </Table>
                </Box>
                <Box width={{ min: 'small' }}>
                    <Heading level="3">Flags</Heading>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Flag</TableCell>
                                <TableCell>Value</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {flagTable.map((row, i) => {
                                return <TableRow key={i}>
                                    <TableCell>{row[0]}</TableCell>
                                    <TableCell>{row[1]}</TableCell>
                                </TableRow>;
                            })}
                        </TableBody>
                    </Table>
                </Box>
            </Box>
            <Box>
                <Heading level="3">i8253 Data</Heading>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHeader>
                </Table>
            </Box>
        </Fragment>
    );
}
