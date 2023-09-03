import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'

export default class KeybindingBehaviorOutsideOfOverviewRow {
	constructor({ settings, settingsKeyName }) {
		this.settings = settings
		this.settingsKeyName = settingsKeyName
	}

	row() {
		const row = new Adw.ActionRow({
			title: this.#settingsKey().get_summary(),
			subtitle: `
				<b>Default:</b> Keybindings will behave normally. <i>(May cause choppy animation when opening/closing overview.)</i>
				<b>Reorder:</b> Keybindings will reorder workspaces.
				<b>Disabled:</b> Keybindings will have no effect.
			`.trim().replace(/^[^\S\r\n]+/umg, ''),
		})

		const comboBox = this.#comboBox()
		row.add_suffix(comboBox)
		row.activatable_widget = comboBox // eslint-disable-line camelcase

		return row
	}

	#settingsKey() {
		return this.settings.settings_schema.get_key(this.settingsKeyName)
	}

	#comboBox() {
		const comboBox = new Gtk.ComboBoxText

		for (const id of this.#settingsKey().get_range().deep_unpack()[1].get_strv()) {
			let text
			switch (id) {
				case 'default':
					text = 'Default'
					break
				case 'reorder':
					text = 'Reorder'
					break
				case 'disabled':
					text = 'Disabled'
					break
			}

			comboBox.append(id, text)
		}
		comboBox.set_active_id(this.settings.get_string(this.settingsKeyName))

		comboBox.connect('changed', () => {
			this.settings.set_string(this.settingsKeyName, comboBox.get_active_id())
		})

		return comboBox
	}
}
