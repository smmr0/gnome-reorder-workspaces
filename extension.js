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

const { Meta, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

function init() {}

function enable() {
	if (Main.overview._visible) {
		enableKeybindings();
	}

	Main.overview.connect('showing', () => {
		log('showing');
		enableKeybindings();
	});
	Main.overview.connect('hiding', () => {
		log('hiding');
		disableKeybindings();
	});
}

function disable() {
	disableKeybindings();
}

function enableKeybindings() {
	const settings = ExtensionUtils.getSettings();

	Main.wm.addKeybinding(
		'move-workspace-up',
		settings,
		Meta.KeyBindingFlags.NONE,
		Shell.ActionMode.OVERVIEW,
		() => {
			const activeWorkspace = global.workspace_manager.get_active_workspace();
			global.workspace_manager.reorder_workspace(
				activeWorkspace,
				activeWorkspace.index() - 1
			)
		}
	);
	Main.wm.addKeybinding(
		'move-workspace-down',
		settings,
		Meta.KeyBindingFlags.NONE,
		Shell.ActionMode.OVERVIEW,
		() => {
			const activeWorkspace = global.workspace_manager.get_active_workspace();
			global.workspace_manager.reorder_workspace(
				activeWorkspace,
				activeWorkspace.index() + 1
			)
		}
	);
}

function disableKeybindings() {
	Main.wm.removeKeybinding('move-workspace-up');
	Main.wm.removeKeybinding('move-workspace-down');
}
