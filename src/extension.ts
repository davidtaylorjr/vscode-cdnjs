/// <reference path="../typings/all.d.ts" />

'use strict';

import * as vscode from 'vscode';
import * as request from 'request';
import * as copyPaste from 'copy-paste';

export function activate(context: vscode.ExtensionContext) {

  const baseUrl = 'https://api.cdnjs.com/libraries';
  const searchUrl = baseUrl + '?fields=version,description,homepage';
  const embedUrl = 'https://cdnjs.cloudflare.com/ajax/libs';

  let disposable = vscode.commands.registerCommand('cdnjs.search', () => {

    vscode.window.showInputBox({
      placeHolder: 'Type in the name of a library, i.e. jquery'
    }).then((value) => {

      // No search string was entered
      if (typeof(value) === 'undefined') {
        return false;
      }

      // TODO: handle search string consisting of only spaces

      // TODO: Update the status bar to indicate searching

      // Search cdnjs api
      request(searchUrl + '&search=' + value, (err, res, body) => {

        // TODO: Need to add error handling here
        // for err, res.status != 200 and !body.results

        let results = JSON.parse(body).results;

        // Build array of libraries
        let items = [];
        for (let result of results) {

          // Create QuickPickItem for library
          let item = {
            label: result.name,
            description: result.description,
            currentVersion: result.version,
            name: result.name
          };
          items.push(item);
        }

        // Show QuickPick of search results
        vscode.window.showQuickPick(items, {
          placeHolder: 'Choose a library (' + items.length + ' results)',
          matchOnDescription: true
        }).then((library) => {

          // No library was chosen
          if (typeof(library) === 'undefined') {
            return false;
          }

          // TODO: Update the status bar to indicate searching

          // Request library versions
          request(baseUrl + "/" + library.name, (err, res, body) => {

            // TODO: error handling

            body = JSON.parse(body);
            let assets = body.assets;

            // Build array of library versions
            let items = [];
            for (let asset of assets) {

              // QuickPickItem for the library version
              let item = {
                label: asset.version,
                files: asset.files,
                version: asset.version
              };

              // Add description if this is the current/latest/stable version
              if (asset.version === library.currentVersion) {
                item.description = 'current version';
              }
              items.push(item);
            }

            // Show QuickPick of versions
            vscode.window.showQuickPick(items, {
              placeHolder: 'Choose a version'
            }).then((asset) => {

              // No asset was chosen
              if (typeof(asset) === 'undefined') {
                return false;
              }

              // Build array of asset files
              let items = [];
              for (let file of asset.files) {
                items.push(file);
              }

              // Show QuickPick of asset files
              vscode.window.showQuickPick(items, {
                placeHolder: 'Choose a file to embed'
              }).then((file) {

                // No file was chosen
                if (typeof(file) === 'undefined') {
                  return false;
                }

                // Build the url for the file
                let url = embedUrl + '/' + library.name + '/' + asset.version + '/' + file;

                let items = [];
                items.push({
                  label: "Insert URL",
                  detail: url
                });
                switch (file.split('.').pop()) {
                  case 'js':
                    items.push({
                      label: "Insert <script> tag",
                      detail: '<script src="' + url + '"></script>'
                    });
                    break;

                  case 'css':
                    items.push({
                      label: "Insert <link> tag",
                      detail: '<link rel="stylesheet" href="' + url + '"/>'
                    });
                    break;

                  default:
                    break;
                }

                vscode.window.showQuickPick(items, {
                  placeHolder: 'Choose an option'
                }).then((option) => {

                  // No option was chosen
                  if (typeof(option) === 'undefined') {
                    return false;
                  }

                  // Insert the string into document at cursor position(s)
                  insertText(option.detail);

                  return true;
                });

              });

              return true;
            });

          });

        });

      });

      return true;
    });


  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

// Insert text into active document at cursor positions
private function insertText(text) {

  let textEditor = vscode.window.activeTextEditor;
  // Get the active text document's uri
  let uri = textEditor.document.uri;

  // Create a new TextEdit for each selection
  let edits = [];
  for (let selection of textEditor.selections) {
    edits.push(vscode.TextEdit.insert(selection.active, text);
  }

  // New WorkspaceEdit
  let edit = new vscode.WorkspaceEdit();
  edit.set(uri, edits);

  // Applying the WorkspaceEdit
  vscode.workspace.applyEdit(edit);
}