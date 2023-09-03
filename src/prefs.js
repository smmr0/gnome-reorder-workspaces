import Adw from 'gi://Adw'
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

import AccelRow from './AccelRow.js'
import KeybindingBehaviorOutsideOfOverviewRow from './KeybindingBehaviorOutsideOfOverviewRow.js'

export default class ReorderWorkspacesPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		const page = new Adw.PreferencesPage

		const group = new Adw.PreferencesGroup
		page.add(group)

		const settings = this.getSettings()

		for (const dir of ['prev', 'next']) {
			const accelRow =
				new AccelRow({
					settings,
					settingsKeyName: `move-workspace-${dir}`,
				})
			group.add(accelRow.row())
		}
		const keybindingBehaviorOutsideOfOverviewRow =
			new KeybindingBehaviorOutsideOfOverviewRow({
				settings,
				settingsKeyName: 'keybinding-behavior-outside-of-overview',
			})
		group.add(keybindingBehaviorOutsideOfOverviewRow.row())

		window.add(page)
	}
}
