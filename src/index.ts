import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";

const ATTRIBUTE_PREFIX = 'attr_';
const FG_W = '\x1b[37m'; // white
const FG_GR = '\x1b[90m'; // grey
const FG_Y = '\x1b[33m'; // yellow

type XliffFile = {
    xliff: {
        file: {
            body: {
                "trans-unit": [{
                    source: {
                        "#text": string
                    },
                    target: {
                        "#text": string
                    },
                    "attr_id": string,
                }]
            }
        }
    }
};

type TransUnit = {
    id: string,
    source: string,
    target: string,
    filename: string,
}

const files = process.argv.slice(2);
console.log('checking files', files);
const parser = new XMLParser({ parseAttributeValue: true, ignoreAttributes: false, attributeNamePrefix: ATTRIBUTE_PREFIX });

const transUnitMap = new Map<string, TransUnit[]>();

files.forEach(f => {
    const content = fs.readFileSync(f);
    const parsed = parser.parse(content) as XliffFile;
    parsed.xliff.file.body["trans-unit"].forEach(tu => {
        const transUnitsForId = transUnitMap.get(tu.attr_id);
        const newTu = {
            id: tu.attr_id,
            source: tu.source["#text"],
            target: tu.target["#text"],
            filename: f,
        };

        if (!transUnitsForId) {
            transUnitMap.set(tu.attr_id, [newTu]);
        } else {
            transUnitsForId.push(newTu);
        }
    });
});

console.log("Trans Units found:", transUnitMap.size);
const duplicatedTransUnits = Array.from(transUnitMap.values()).filter(tus => tus.length > 1);
console.log("Duplicated ids:", duplicatedTransUnits.length);

let incosistencies = false;
duplicatedTransUnits.forEach(di => {
    const baseTu = di[0];
    di.slice(1).filter(tu => tu.target !== baseTu.target).forEach(tu => {
        console.error(`${FG_Y}"${tu.target}" ${FG_GR}(${tu.filename})${FG_W} differs from ${FG_Y}"${baseTu.target}" ${FG_GR}(${baseTu.filename})${FG_W} for trans-unit id ${FG_Y}${baseTu.id}${FG_W}`);
        incosistencies = true;
    });
});

if (incosistencies) {
    process.exit(1);
}
