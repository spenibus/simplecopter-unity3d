#pragma strict


// flight model
public var flightModelSimple : boolean = true;


/**
helicopter specs
force = mass * acceleration
**/
private var bodyMass     : float = 1000;
private var enginePower  : float = 9.81 * bodyMass;     // just enough to hover
private var engineTorque : float = 180 * Mathf.Deg2Rad; // deg/sec to turn around


// swashplate (cyclic control)
private var swashplateFront : Transform;
private var swashplateBack  : Transform;
private var swashplateLeft  : Transform;
private var swashplateRight : Transform;


// swashplate collective (added factor)
private var swashplateCollective    : float =  0;
private var swashplateCollectiveMin : float = -2;
private var swashplateCollectiveMax : float =  2;


// swashplate cyclic (added factor)
private var swashplateCyclicMax : float = 1;


// helo object
private var helo : Transform;


// rotor object
private var rotor : Transform;


// user control
private var heloControl : flightControl;


// helo flight data
private var heloFlightData : flightData;




/******************************************************************************/
function Start() {

   // user control
   heloControl = transform.GetComponent(flightControl);

   // helo flight data
   heloFlightData = transform.GetComponent(flightData);

   // helo is self
   helo = transform;

   // rotor
   rotor = transform.Find("rotor");

   // swashplate
   swashplateFront = transform.Find("rotor/swashplateFront");
   swashplateBack  = transform.Find("rotor/swashplateBack");
   swashplateLeft  = transform.Find("rotor/swashplateLeft");
   swashplateRight = transform.Find("rotor/swashplateRight");
}




/******************************************************************************/
function FixedUpdate() {


   /**
   switch flight model
   **/
   if(Input.GetKeyDown("f")) {
      flightModelSimple = !flightModelSimple;
   }


   /**
   init swashplate points
   these are factors
   they are affected by collective control and cyclic control
   **/
   var swashplatePowerFront : float = 1;
   var swashplatePowerBack  : float = 1;
   var swashplatePowerRight : float = 1;
   var swashplatePowerLeft  : float = 1;




   /**
   collective control
   this raises/lowers the swashplate evenly
   **/
   // collective up, raise swashplate
   if(heloControl.controlCollective > 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective + Time.deltaTime,
         swashplateCollectiveMin,
         swashplateCollectiveMax
      );
   }

   // collective down, lower swashplate
   else if(heloControl.controlCollective < 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective - Time.deltaTime,
         swashplateCollectiveMin,
         swashplateCollectiveMax
      );
   }

   // idle, lower swashplate
   else if(swashplateCollective > 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective - Time.deltaTime,
         0,
         swashplateCollectiveMax
      );
   }

   // idle, raise swashplate
   else if(swashplateCollective < 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective + Time.deltaTime,
         swashplateCollectiveMin,
         0
      );
   }

   // add collective swashplate power
   swashplatePowerFront += swashplateCollective;
   swashplatePowerBack  += swashplateCollective;
   swashplatePowerRight += swashplateCollective;
   swashplatePowerLeft  += swashplateCollective;




   /**
   yaw control
   this is simplified
   we can pretend to use the rotor's torque
   **/
   helo.rigidbody.AddRelativeTorque(Vector3(
      0.0,
      engineTorque * heloControl.controlYaw * Mathf.Abs(heloControl.controlYaw),
      0.0
   ), ForceMode.Acceleration);




   /**
   cyclic control
   **/
   var controlPitch = heloControl.controlPitch;
   var controlRoll  = heloControl.controlRoll;



   /**
   control model, simple
   **/
   if(flightModelSimple) {

      // pitch
      swashplatePowerFront += swashplateCyclicMax * controlPitch;
      swashplatePowerBack  += swashplateCyclicMax * controlPitch * -1;

      // roll
      swashplatePowerLeft  += swashplateCyclicMax * controlRoll;
      swashplatePowerRight += swashplateCyclicMax * controlRoll * -1;
   }




   /**
   control model, advanced
   inputs are squared for finer control
   this is meant for joystick, not mouse
   experimental
   **/
   else {


      /**
      swashplate, cyclic input
      stick position controls swashplate tilt
      **/


      // square
      controlPitch = controlPitch * Mathf.Abs(controlPitch);
      controlRoll  = controlRoll  * Mathf.Abs(controlRoll);


      // pitch
      swashplatePowerFront += swashplateCyclicMax * controlPitch;
      swashplatePowerBack  += swashplateCyclicMax * controlPitch * -1;

      // roll
      swashplatePowerLeft  += swashplateCyclicMax * controlRoll;
      swashplatePowerRight += swashplateCyclicMax * controlRoll * -1;




      /**
      stabilizer
      rudimentary
      **/




      // default stabilizer values, 0.01 per degree
      var stabilizerPitch : float = heloFlightData.pitch / -100;
      var stabilizerRoll  : float = heloFlightData.roll  / -100;


      // square (matching cyclic input)
      stabilizerPitch *= Mathf.Abs(stabilizerPitch);
      stabilizerRoll  *= Mathf.Abs(stabilizerRoll);


      // apply stabilizer correction, pitch
      swashplatePowerFront += stabilizerPitch;
      swashplatePowerBack  += stabilizerPitch * -1;


      // apply stabilizer correction, roll
      swashplatePowerLeft  += stabilizerRoll;
      swashplatePowerRight += stabilizerRoll * -1;
   }




/*
Retreating blade stall

Helicopters are inherently asymetric flying machines. In forward flight, there
will at any moment in time be one blade moving in the direction of flight
(called the advancing blade) and one moving opposite to the direction of flight
(called the retreating blade).

As the helicopter accellerates, the advancing blade's airspeed in its relative
wind increases; conversely, the airspeed of the retreating blade decreases. As
the helicopter goes faster, various parts of the retreating blade may stall and
no longer generate lift. When this happens, the aircraft nose will rise (as the
effect of the lack of lift takes place 90 degress later in the blade's cycle),
possibly violently.
*/




   /**
   lift power: base
   this is an efficiency factor for the engine power
   **/
   var liftPowerFactor : float = 1;





   /**
   lift power: ground effect (cushion)
   + 0% at 5 metres
   +25% at 0 metres
      TODO: apply to all surfaces, not just ground, given sufficient area
   **/
   var cushionFactor : float = 1 - heloFlightData.altitude / 5;
   cushionFactor = Mathf.Clamp(cushionFactor, 0, 1);
   cushionFactor *= cushionFactor; // square
   liftPowerFactor += cushionFactor * 0.25;




   /**
   lift power: effective translational lift
   + 0% at  0m/s
   +25% at 20m/s and beyond (horizontal speed)
   **/
   var etlPowerFactor : float = heloFlightData.speedHorizontal / 20;
   etlPowerFactor = Mathf.Clamp(etlPowerFactor, 0, 1);
   etlPowerFactor *= etlPowerFactor; // square
   liftPowerFactor += etlPowerFactor * 0.25;




   /**
   apply lift power and swashplate action
   **/
   var liftPowerPerPoint : float = enginePower * liftPowerFactor / 4;


   helo.rigidbody.AddForceAtPosition(
      swashplateFront.up * liftPowerPerPoint * swashplatePowerFront,
      swashplateFront.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateBack.up * liftPowerPerPoint * swashplatePowerBack,
      swashplateBack.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateLeft.up * liftPowerPerPoint * swashplatePowerLeft,
      swashplateLeft.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateRight.up * liftPowerPerPoint * swashplatePowerRight,
      swashplateRight.position,
      ForceMode.Force
   );




/**/
   print(""
      +" F: "+swashplatePowerFront
      +" B: "+swashplatePowerBack
      +" L: "+swashplatePowerLeft
      +" R: "+swashplatePowerRight
   );
/**/
}