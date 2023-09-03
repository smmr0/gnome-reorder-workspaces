import Adw from 'gi://Adw'
import GLib from 'gi://GLib'
import GObject from 'gi://GObject'
import Gtk from 'gi://Gtk'

export default class AccelRow {
	#settings
	#settingsKeyName

	constructor({ settings, settingsKeyName }) {
		this.#settings = settings
		this.#settingsKeyName = settingsKeyName
	}

	row() {
		const row = new Adw.ActionRow({ title: this.#settingsKey().get_summary() })

		const tree = this.#tree()
		row.add_suffix(tree)
		row.activatable_widget = tree // eslint-disable-line camelcase

		return row
	}

	#settingsKey() {
		return this.#settings.settings_schema.get_key(this.#settingsKeyName)
	}

	#tree() {
		const model = this.#model()

		const tree = new Gtk.TreeView({ model, headers_visible: false }) // eslint-disable-line camelcase
		tree.append_column(this.#column({ model }))

		return tree
	}

	#model() {
		const model = new Gtk.ListStore
		model.set_column_types([GObject.TYPE_STRING])
		const [_ok, key, mods] =
			Gtk.accelerator_parse(
				this.#settings.get_strv(this.#settingsKeyName)[0],
			)
		model.set_value(model.append(), 0, Gtk.accelerator_get_label(key, mods))

		return model
	}

	#column({ model }) {
		const column = new Gtk.TreeViewColumn

		const accel = this.#accel({ model })
		column.pack_start(accel, false)
		column.add_attribute(accel, 'text', 0)

		return column
	}

	#accel({ model }) {
		const accel =
			new Gtk.CellRendererAccel({
				editable: true,
				accel_mode: Gtk.CellRendererAccelMode.GTK, // eslint-disable-line camelcase
			})
		accel.connect('accel-edited', (_accel, iter, key, mods) => { // eslint-disable-line max-params
			if (key === undefined || key === null) {
				return
			}

			const name = Gtk.accelerator_name(key, mods)
			const [, iterator] = model.get_iter_from_string(iter)
			model.set(iterator, [0], [Gtk.accelerator_get_label(key, mods)])
			this.#settings.set_value(
				this.#settingsKeyName,
				new GLib.Variant('as', [name]),
			)
		})

		return accel
	}
}
