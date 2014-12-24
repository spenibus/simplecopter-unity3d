#pragma strict




// helo object
public var helo : Transform;


// data
public var azimuth : float;
public var pitch   : float;
public var roll    : float;

public var altitude : float;

public var speed           : float;
public var speedHorizontal : float;
public var speedVertical   : float;

public var speedPitch : float;
public var speedRoll  : float;
public var speedYaw   : float;

public var fpvHorizontal : float;
public var fpvVertical   : float;




/******************************************************************************/
function Start() {

   // helo is self
   helo = transform;
}




/******************************************************************************/
function FixedUpdate() {


   // velocities
   var heloVelo      = helo.rigidbody.velocity;
   var heloVeloLocal = transform.InverseTransformDirection(heloVelo);
   var heloTorque    = helo.rigidbody.angularVelocity;


   // azimuth (0-360)
   azimuth = helo.localEulerAngles.y % 360;


   // pitch (+/- 90)
   pitch = helo.localRotation.eulerAngles.x;
   pitch = pitch > 90
      ? 360 - pitch
      :   0 - pitch;


   // roll  (+/- 180)
   roll = helo.localRotation.eulerAngles.z;
   roll = roll > 180
      ? 360 - roll
      :   0 - roll;


   // altitude
   altitude = helo.position.y - 0.48;


   // speed (forward)
   speed = heloVeloLocal.z;


   // speed (horizontal)
   speedHorizontal = Vector3(heloVeloLocal.x, 0, heloVeloLocal.z).magnitude;


   // speed (vertical)
   speedVertical = heloVelo.y;


   // torque velocity, pitch
   speedPitch = heloTorque.x;


   // torque velocity, roll
   speedRoll = heloTorque.z;


   // torque velocity, yaw
   speedYaw = heloTorque.y;


   /**
   fpv, flight path vector
   shows real direction of the helicopter
   reminder: radians
   return degrees -180/180
   **/
   fpvHorizontal = Mathf.Atan2(heloVeloLocal.x, heloVeloLocal.z) * Mathf.Rad2Deg;
   fpvVertical   = Mathf.Atan2(heloVeloLocal.y, heloVeloLocal.z) * Mathf.Rad2Deg;
}