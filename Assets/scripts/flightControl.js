#pragma strict




// inputMethod
public var useMouse : boolean = true;


// key bindings
private var key_collective_up   : String = "w";
private var key_collective_down : String = "s";
private var key_yaw_right       : String = "d";
private var key_yaw_left        : String = "a";


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
   if(Input.GetKeyDown("r")) {
      Application.LoadLevel(Application.loadedLevel);
   }


   // switch input method
   if(Input.GetKeyDown("i")) {
      useMouse = !useMouse;
   }



   /**
   cyclic controls, mouse emulating joystick
   forward/back = -1/1
   left/right   = -1/1
   **/
   var inputRoll  : float = 0;
   var inputPitch : float = 0;


   // mouse
   if(useMouse) {
      controlRoll  = Mathf.Clamp(Input.GetAxis("Mouse X"),      -1, 1);
      controlPitch = Mathf.Clamp(Input.GetAxis("Mouse Y") * -1, -1, 1);
/*
      inputRoll  = Input.GetAxis("Mouse X");
      inputPitch = Input.GetAxis("Mouse Y") * -1;

      // real values
      controlRollReal  = Mathf.Clamp(controlRollReal  + inputRoll,  -1, 1);
      controlPitchReal = Mathf.Clamp(controlPitchReal + inputPitch, -1, 1);

      // copy real to exposed
      controlRoll  = controlRollReal;
      controlPitch = controlPitchReal;
*/
   }
   // joystick
   else {
      controlRoll  = Input.GetAxis("Horizontal");
      controlPitch = Input.GetAxis("Vertical");
   }




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