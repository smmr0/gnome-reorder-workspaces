/*
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const { Gio, Meta, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

let overviewShowingId;
let overviewHidingId;

const MUTTER_SCHEMA = 'org.gnome.mutter';
let mutterSettings;
let dynamicWorkspacesId;
let dynamicWorkspaces;

function init() {} // eslint-disable-line no-unused-vars

function enable() { // eslint-disable-line no-unused-vars
	mutterSettings = new Gio.Settings({ schema_id: MUTTER_SCHEMA });
	dynamicWorkspacesId =
		mutterSettings.connect(
			'changed::dynamic-workspaces',
			this.setDynamicWorkspaces.bind(this)
		);
	setDynamicWorkspaces();

	if (Main.overview._visible) {
		enableKeybindings();
	}

	overviewShowingId =
		Main.overview.connect('showing', () => {
			enableKeybindings();
		});
	overviewHidingId =
		Main.overview.connect('hiding', () => {
			disableKeybindings();
		});
}

function disable() { // eslint-disable-line no-unused-vars
	disableKeybindings();

	Main.overview.disconnect(overviewShowingId);
	Main.overview.disconnect(overviewHidingId);
	mutterSettings.disconnect(dynamicWorkspacesId);
}

function setDynamicWorkspaces() {
	dynamicWorkspaces = mutterSettings.get_boolean('dynamic-workspaces');
}

function enableKeybindings() {
	const settings = ExtensionUtils.getSettings();

	Main.wm.addKeybinding(
		'move-workspace-prev',
		settings,
		Meta.KeyBindingFlags.NONE,
		Shell.ActionMode.OVERVIEW,
		moveWorkspaceUp.bind(this)
	);
	Main.wm.addKeybinding(
		'move-workspace-next',
		settings,
		Meta.KeyBindingFlags.NONE,
		Shell.ActionMode.OVERVIEW,
		moveWorkspaceDown.bind(this)
	);
}

function disableKeybindings() {
	Main.wm.removeKeybinding('move-workspace-prev');
	Main.wm.removeKeybinding('move-workspace-next');
}

function moveWorkspaceUp() {
	const activeWorkspace = global.workspace_manager.get_active_workspace();

	if (activeWorkspace.index() <= 0) {
		return;
	}

	if (dynamicWorkspaces && activeWorkspace !== null && activeWorkspace.n_windows === 0) {
		return;
	}

	global.workspace_manager.reorder_workspace(
		activeWorkspace,
		activeWorkspace.index() - 1
	);
}

function moveWorkspaceDown() {
	const activeWorkspace = global.workspace_manager.get_active_workspace();

	if (activeWorkspace.index() >= global.workspace_manager.get_n_workspaces() - 1) {
		return;
	}

	const belowWorkspace = global.workspace_manager.get_workspace_by_index(activeWorkspace.index() + 1);
	if (dynamicWorkspaces && belowWorkspace !== null && belowWorkspace.n_windows === 0) {
		return;
	}

	global.workspace_manager.reorder_workspace(
		activeWorkspace,
		activeWorkspace.index() + 1
	);
}
