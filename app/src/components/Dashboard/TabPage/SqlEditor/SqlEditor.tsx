import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import monacoEditor, { Position} from 'monaco-editor';
import { Flex, FlexProps } from 'reflexy';
import classNames from 'classnames';
import { languageDef, configuration } from './Clickhouse';
import Toolbar, { Props as ToolbarProps } from './Toolbar';
import css from './SqlEditor.css';

const monacoEditorOptions: monacoEditor.editor.IEditorConstructionOptions = {
  language: 'clickhouse',
  theme: 'vs-dark',
  automaticLayout: true,
  selectOnLineNumbers: true,
  fontSize: 14,
  formatOnPaste: true,
  fontFamily: 'Menlo',
};

type Monaco = typeof monacoEditor;
export type CodeEditor = monacoEditor.editor.IStandaloneCodeEditor;

export interface SqlEditorProps extends ToolbarProps {
  content: string;
  onContentChange: (content: string) => void;
  editorRef?: (editor?: CodeEditor) => void;
}

export default class SqlEditor extends React.Component<SqlEditorProps & FlexProps> {
  componentWillUnmount() {
    const { editorRef } = this.props;
    editorRef && editorRef(undefined);
  }

  private onEditorWillMount = (monaco: Monaco) => {

    // monaco.editor.defineTheme('cobalt', theme_cobalt);
    // monaco.editor.setTheme('cobalt');

    if (!monaco.languages.getLanguages().some(({ id }) => id === 'clickhouse')) {
      // Register a new language
      monaco.languages.register({ id: 'clickhouse' });
      // Register a tokens provider for the language
      monaco.languages.setMonarchTokensProvider('clickhouse', languageDef as any);
      // Set the editing configuration for the language
      monaco.languages.setLanguageConfiguration('clickhouse', configuration);
      monaco.languages.registerCompletionItemProvider('clickhouse', {
        provideCompletionItems() {
          return [
            { label: 'Server', kind: monaco.languages.CompletionItemKind.Text },
            { label: 'Request', kind: monaco.languages.CompletionItemKind.Text },
            { label: 'Response', kind: monaco.languages.CompletionItemKind.Text },
            { label: 'Session', kind: monaco.languages.CompletionItemKind.Text },
          ];
        },
      });
      // registerCompletionItemProvider
      console.log('monaco - register ClickHouse', languageDef);
    }
  };

  private onEditorDidMount = (editor: CodeEditor, monaco: Monaco) => {
    const { editorRef } = this.props;
    editorRef && editorRef(editor);

    const self = this;

    const KM = monaco.KeyMod;
    const KC = monaco.KeyCode;


    // ======== Command-Enter ========
    editor.addAction({
      id: 'my-exec-code',
      label: 'Exec current code',
      keybindings: [KM.CtrlCmd | KC.Enter],
      // A precondition for this action.
      // precondition: undefined,
      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      // keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convinience
      // run:this.executeCommand
      run(editor) {
        self.executeCommand('current', editor, monaco);
      },
    });
    // ======== Shift-Command-Enter ========
    editor.addAction({
        id: 'my-exec-all',
        label: 'Exec All',
        keybindings: [ KM.Shift | KM.CtrlCmd | KC.Enter],
        precondition: undefined,
        keybindingContext: undefined,
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run(editor) {
            self.executeCommand('all',editor,monaco);
        }
    });
    // ======== Command+Shift+- / Command+Shift+= ========
    editor.addCommand(KM.chord(KM.Shift | KM.CtrlCmd | KC.US_MINUS,0),  function() {
        editor.getAction('editor.foldAll').run();
    },'');
    editor.addCommand(KM.chord(KM.Shift | KM.CtrlCmd | KC.US_EQUAL,0), function() {
        editor.getAction('editor.unfoldAll').run();
    },'');
    // ======== Shift-CtrlCmd-F ========
    editor.addCommand(KM.chord(KM.Shift | KM.CtrlCmd | KC.KEY_F,0), function() {
        editor.getAction("editor.action.formatDocument").run();
    },'');
    // ======== Cmd-Y ========
    editor.addCommand(KM.chord( KM.CtrlCmd | KC.KEY_Y,0), function() {
        editor.getAction("editor.action.deleteLines").run();
    },'');

    // @todo: Command-Shift-[NUM]
    // for (let i = 0; i < 9; i++) {
    //     editor.addCommand(monaco.KeyMod.chord( monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode['KEY_'+i]), function() {
    //         console.warn('actionChangeTab',i);
    //         self.actionChangeTab(i);
    //     });
    // }

    // @todo:  Command-Left | Command-Right | Shift-Alt-Command-Right | Shift-Alt-Command-Right


    editor.focus();
  };
  private splitByTokens = (
      _monaco: Monaco,
      editor: monacoEditor.editor.ICodeEditor,
      text:string,
      cursorPosition: Position,
      spitToken:string
  ) => {
      const lenVV=2;
      let splits : Array<object> =[];

      let tokensList  : object =[];
      let firstToken  : object ={
          line:1,
          offset:1,
          type:false,
      };
      let prewToken : object ={
          line:1,
          offset:1,
          type:false,
          typeT:false,
      };

      let tokens = _monaco.editor.tokenize(text,'clickhouse');

      tokens.forEach(
          (lineTokens:any,line:number) => {

          line=line+1;
          lineTokens.forEach((token:monacoEditor.languages.IToken[])=> {
              if (prewToken['type'])
              {
                  if (!Array.isArray(tokensList[prewToken['type']])) tokensList[prewToken['type']]=[];
                  let ll_range=new _monaco.Range(
                      prewToken['line'],
                      prewToken['offset'],
                      line,
                      token['offset']+1
                  );

                  let tokenText= editor.getModel().getValueInRange(ll_range);
                  tokenText=tokenText.trim();
                  if (tokenText.length) {
                      tokensList[prewToken['type']].push(
                          tokenText
                      );
                  }
              }

              if (!firstToken) {
                  token['line']=line;
                  firstToken=token;
              }
              if (token['type']===spitToken) {
                  splits.push({
                      startLineNumber:firstToken['line'],
                      startColumn:firstToken['offset'],
                      endLineNumber:line,
                      endColumn:1+token['offset'],
                      tokens:tokensList
                  });
                  tokensList=[];
                  firstToken['line']=line;
                  firstToken['offset']=1+token['offset']+lenVV;
              }
              prewToken={
                  type:token['type'],
                  line:line,
                  offset:1+token['offset'],
              };
          });
      });


      // push last or all
      splits.push({
          startLineNumber: firstToken['line'],
          startColumn: firstToken['offset'],
          endLineNumber: Number.MAX_VALUE,
          endColumn: Number.MAX_VALUE,
          tokens:tokensList
      });

      let list_query: Array<object> =[];

      splits.forEach((splitRange)=>{
          let range=new _monaco.Range(
              splitRange['startLineNumber'],
              splitRange['startColumn'],
              splitRange['endLineNumber'],
              splitRange['endColumn']
          );
          let text=editor.getModel().getValueInRange(range);
          let inCursor=range.containsPosition(cursorPosition);
          if (text.trim().length<1) return;
          list_query.push(
              {
                  sql:text,
                  range:range,
                  inCursor:inCursor,
                  tokens:splitRange['tokens']
              }
          );
      });

      return list_query;

  };
  private executeCommand = (
    _typeCommand: string,
    editor: monacoEditor.editor.ICodeEditor,
    _monaco: Monaco
  ) => {
    // window.edit = editor; // debug
    // window.monaco = monaco; // debug

    const spliterToken='warn-token.sql';  // can change in future
    const position = editor.getPosition();
    const selectedText = editor.getModel().getValueInRange(editor.getSelection());
    const allValue = editor.getValue();
    console.log(`executeCommand running => ${position}`);

    // console.info('!!!Text in selected!!!',selectedText);
    // console.info('!!!allValue!!!',allValue);
    let sql = allValue;
    if (!(selectedText === '' || selectedText === null)) {
      sql = selectedText;
    }
    console.info(`%c ${sql}`, 'color: #bada55');

    let splits=this.splitByTokens(_monaco,editor,sql,position,spliterToken);

    console.info('splits',_typeCommand,splits);

    // inCursor=true:Если комманда исполнить текущий и НЕ выделен текст -> пропускаем все пока не найдем подходящий

      // let range=monaco.editor.Range()
    // const tokens = monaco.editor.tokenize('select * from ;; select', 'clickhouse');
    // console.log(editor,tokens);

    // Получить список всех -- WARN-Tokens
    // let selectSql = editor.getSelectedText();
    // let sql=tab.editor.getValue();
    // if (!(selectSql === '' || selectSql === null)) { sql = selectSql;}
    // .splitByTokens(sql, 'constant.character.escape', use_delimiter).forEach((item) => { })
    // Если исполнить текущий - то дальше не парсим если уже есть один в списке
    // if (type == 'current' && numquery>0) return;
    //   let drawCommand=[];
    //  let subSql = item.sql;
    //  Если комманда исполнить текущий и НЕ выделен текст -> пропускаем все пока не найдем подходящий
    //   if (type == 'current' && !selectSql) {
    //       let cursor = editor.selection.getCursor();
    //       let rg=item.range.compare(cursor.row, cursor.column);
    //       if (rg !== 0) return ;
    // let SaveSql=subSql.trim();
    // определяем есть ли комманда DRAW .* - все что после нее есть JavaScript
    // вырезаем если комманда есть
    // let set_format = editor.session.$mode.findTokens(subSql, "storage", true);
    // let keyword = editor.session.$mode.findTokens(subSql, "keyword", true);
    // for  ['DROP', 'CREATE', 'ALTER'].indexOf(keyword.toUpperCase())

    // console.log(' running => ' + editor.getPosition(),editor);
    // console.log(this.monaco);
    // let tokens=this.monaco.editor.tokenize('select * from ;; select','clickhouse');
    // console.log(editor,tokens);
    return null;
  };

  render() {
    const {
      databases,
      currentDatabase,
      onDatabaseChange,
      content,
      onContentChange,
      editorRef,
      onAction,
      className,
      ...rest
    } = this.props;

    return (
      <Flex column className={classNames(css.root, className)} {...rest}>
        <Flex grow fill className={css.editor}>
          <MonacoEditor
            options={monacoEditorOptions}
            editorWillMount={this.onEditorWillMount}
            editorDidMount={this.onEditorDidMount}
            value={content}
            onChange={onContentChange}
          />
        </Flex>

        <Toolbar
          className={css.toolbar}
          databases={databases}
          currentDatabase={currentDatabase}
          onDatabaseChange={onDatabaseChange}
          onAction={onAction}
        />
      </Flex>
    );
  }
}
