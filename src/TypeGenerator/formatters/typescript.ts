import { FuncType, default as ObjType} from "../TypeAST";
import * as prettier from "prettier";

// Test if is valid JavaScript identifier.
const isValidIdent = /^[a-z|A-Z|_|$][a-z|A-Z|_|$|1-9]*$/;

/**
* Output the interface declaration for methods. These are only emitted when a Class
* and State occupy the same property name and the types have to be unioned.
* @property type The `FuncType` object to emit code for.
* @return Generated code.
**/
function makeMethodDef(type: FuncType) : string{
  if ( !type.args[0] ) {
    return `
      interface ${type.name} {
        (enabled?: any): Style;
      }
    `;
  }
  return `
    interface ${type.name} {
      (substate: '${type.args[0].sort().join(' | ')}'): Style;
      (substate: string): Style;
    }
  `;
}

/**
* Output the class declaration for BlockObjects. These are emitted for the root
* block, and any BlockClasses with sub-blocks, like States.
* @property type The `ObjType` object to emit code for.
* @return Generated code.
**/
function makeObjectDef(type: ObjType){

  let definitions: string[] = [];
  type.children.forEach((type) => {
    if ( type instanceof ObjType ) {
      definitions.push(makeObjectDef(type));
    }
    else if ( type instanceof FuncType ) {
      definitions.push(makeMethodDef(type));
    }
  });

  // Properties like: `readonly title: TitleClass & TitleState & Style;`
  let properties: string[] = [];
  Object.keys(type.properties).sort().forEach( (key) => {
    type.properties[key].push('Style');
    let safeKey = isValidIdent.test(key) ? key : `'${key}'`;
    properties.push(`readonly ${safeKey}: ${type.properties[key].join(' & ')};`);
    type.properties[key].pop();
  });

  // Methods like: `size(substate: 'small' | 'medium' | 'large' | any): Style;`
  Object.keys(type.methods).sort().forEach((key) =>{
    let safeKey = isValidIdent.test(key) ? key : `'${key}'`;
    if (type.methods[key][0]) {
      properties.push(`${safeKey}(substate: ${type.methods[key][0].map((s) => { return `'${s}'`; }).join(' | ')}): Style;`);
      properties.push(`${safeKey}(substate: string): Style;`);
    }
    else {
      properties.push(`${safeKey}(enabled?: any): Style;`);
    }
  });

  return `
    ${definitions.join('\n\n')}

    declare class ${type.name} {
      ${properties.join('\n')}
    }
  `;
}

/**
* Base type emission function for Typescript.
* @property ast The root `ObjType` object to emit code for.
* @return Generated code.
**/
export default function formatTypescript(ast: ObjType): string {
  return prettier.format(`
    /*****************************************************/
    /*    Autogenerated by CSS Blocks. DO NOT MODIFY.    */
    /*****************************************************/

    declare type Style = { [str: string]: boolean } & symbol;

    ${makeObjectDef(ast)}

    declare let out: ${ast.name} & Style;

    export default out;
  `, {
    parser: 'typescript'
  });
}
