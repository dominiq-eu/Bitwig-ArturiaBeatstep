/**
 *  This file is public domain.
 */

var SHOW_VALUES = true;

var VENDOR   = "Arturia",
    PRODUCT  = "BeatStep - Midi",
    VERSION  = "1.0",
    AUTHOR   = "Dominique Juergensen",
    MIDI_IN  = VENDOR + " " + PRODUCT,
    MIDI_OUT = VENDOR + " " + PRODUCT,
    SYSEX_ID = "F0 7E 00 06 02 00 20 6B 02 00 06 00 ?? ?? ?? ?? F7",
    UUID     = "b37fa9e0-025d-11e6-8d22-5e5517507c66";


// Load BitWig API.
loadAPI(1);

// Register this controller script in BitWig.
host.defineController(VENDOR, PRODUCT, VERSION, UUID, AUTHOR);

// Tell BitWig how many input and output ports we need.
host.defineMidiPorts(1, 1);

// Make controller auto discoverable.
host.addDeviceNameBasedDiscoveryPair([MIDI_IN], [MIDI_OUT]);
host.defineSysexIdentityReply(SYSEX_ID);


var MIN_CC = 0;
var MAX_CC = 127;
var MIDI_CHANNELS = 16;
var NUM_CONTROLS  = (MAX_CC - MIN_CC + 1) * MIDI_CHANNELS;

var cc_list     = initArray(0, NUM_CONTROLS);
var cc_list_old = initArray(0, NUM_CONTROLS);
var note_inputs = initArray(0, MIDI_CHANNELS + 1);

var user_controls = null;
var cc_mapping = {};


/**
 *
 */
function getIndex (ch, cc) {

    return cc - MIN_CC + ((MAX_CC - MIN_CC + 1) * ch);
}

/**
 *
 */
function getObserver (index, list) {
    return function (cc_value) {

        // println("Observer:"+ index +","+ cc_value);
        list[index] = cc_value;
    };
}

/**
 *
 */
function createNoteInput (id, mask) {
    return host.getMidiInPort(0).createNoteInput(id, mask);
}

/**
 *
 */
function init ()
{
    // Tempoary variables.
    var cc = 0;
    var ch = 0;
    var midi_in  = host.getMidiInPort(0);
    var midi_out = host.getMidiOutPort(0);

    // Setup midi controls
    user_controls = host.createUserControls(NUM_CONTROLS);
    for (ch = 0; ch < MIDI_CHANNELS; ++ch) {
        for (cc = MIN_CC; cc < MAX_CC; ++cc) {

            var index = getIndex(ch, cc);
            var label = "Ch " + ch + " - CC " + cc;
            var control = user_controls.getControl(index);

            control.setLabel(label);
            control.addValueObserver(127, getObserver(index, cc_list));
        }
    }

    // Setup Midi -> Text mapping.
    for (ch = 0; ch < MIDI_CHANNELS; ++ch) {
        if ((ch in cc_mapping) === false) {
            cc_mapping[ch] = {};
        }
        for (cc = MIN_CC; cc < MAX_CC; ++cc) {
            if ((cc in cc_mapping[ch]) === false) {
                // cc_mapping[ch][cc] = "CH " + ch + " CC " + cc + " - ";
                // cc_mapping[ch][cc] = "";
                cc_mapping[ch][cc] = "CC " + cc + " - ";
            }
        }
    }

    // Send midi clock to the beatstep sequencer.
    midi_out.setShouldSendMidiBeatClock(true);

    midi_in.setMidiCallback(function (status, cc_val, value)
    {
        // println("Midi: " + status + ", " + cc_val + ", " + value);

        // Check for cc values and forward them to the daw for mapping.
        if (isChannelController(status)) {
            if (cc_val >= MIN_CC && cc_val <= MAX_CC) {

                var ch    = MIDIChannel(status);
                var index = getIndex(ch, cc_val);
                var text  = cc_mapping[ch][cc_val] + value;

                if (SHOW_VALUES) {
                    host.showPopupNotification(text);
                }
                // println("Callback:"+ ch +","+ cc_val +","+ value);
                user_controls.getControl(index).set(value, 128);
            }
        }

        // Check for special keys that execute functions.
    });

    // Create Note Inputs.
    var note_in = midi_in.createNoteInput("Beatstep",
                                          "80????",  // Note off
                                          "90????",  // Note on
                                          "A0????"   // Aftertouch
                                          //,"B0????" // CCs
                                          );
    // Send notes to the MidiCallback.
    note_in.setShouldConsumeEvents(false);
}

/**
 *
 */
/*
function flush ()
{
    println("flush();");
    for (var cc = MIN_CC; cc < MAX_CC; ++cc) {
        for (var ch = 0; ch < MIDI_CHANNELS; ++ch) {

            var index = getIndex(ch, cc);
            if (cc_list[index] !== cc_list_old[index]) {

                sendChannelController(ch, cc, cc_list[index]);
                cc_list_old[index] = cc_list[index];
            }
        }
    }
}
*/
