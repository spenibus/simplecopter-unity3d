#pragma strict




// key bindings
private var key_collective_up   : String = "w";
private var key_collective_down : String = "s";
private var key_yaw_right       : String = "d";
private var key_yaw_left        : String = "a";


// mouse sensitivity, factor
private var mouseSensitivityX : float = 0.1;
private var mouseSensitivityY : float = 0.1;


// mouse dead zone
private var mouseDeadZone : float = 0.0;


// controls
public var controlPitchReal  : float = 0;
public var controlRollReal   : float = 0;
public var controlPitch      : float = 0;
public var controlRoll       : float = 0;
public var controlYaw        : float = 0;
public var controlCollective : float = 0;




/******************************************************************************/
function Update() {

   // keep cursor locked
   Screen.lockCursor = true;
}




/******************************************************************************/
function FixedUpdate() {


   // restart the game on enter key
   if(Input.GetKey("r")) {
      Application.LoadLevel(Application.loadedLevel);
   }




   /**
   cyclic controls, mouse emulating joystick
   forward/back = -1/1
   left/right   = -1/1
   **/
   var inputRoll  : float = Input.GetAxis("Mouse X") * mouseSensitivityX;
   var inputPitch : float = Input.GetAxis("Mouse Y") * mouseSensitivityY * -1;

   // real values
   controlPitchReal = Mathf.Clamp(controlPitchReal + inputPitch, -1, 1);
   controlRollReal  = Mathf.Clamp(controlRollReal  + inputRoll,  -1, 1);

   // copy real to exposed
   controlPitch = controlPitchReal;
   controlRoll  = controlRollReal;

   // exposed, deadzone
   controlPitch = Mathf.Abs(controlPitch) >= mouseDeadZone ? controlPitch : 0;
   controlRoll  = Mathf.Abs(controlRoll)  >= mouseDeadZone ? controlRoll  : 0;




   /**
   yaw
   **/
   // idle
   controlYaw = 0;

   // yaw, right
   if(Input.GetKey(key_yaw_right)) {
      controlYaw = 1;
   }
   // yaw, left
   else if(Input.GetKey(key_yaw_left)) {
      controlYaw = -1;
   }




   /**
   collective control, modifies engine power
   **/
   // idle
   controlCollective = 0;

   // collective up
   if(Input.GetKey(key_collective_up)) {
      controlCollective = 1;
   }
   // collective down
   else if(Input.GetKey(key_collective_down)) {
      controlCollective = -1;
   }
}