#pragma strict




// flight model
public var flightModelSimple : boolean = false;


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
   //var controlPitch = heloControl.controlPitch * Mathf.Abs(heloControl.controlPitch);
   //var controlRoll  = heloControl.controlRoll  * Mathf.Abs(heloControl.controlRoll);

   //print(Time.deltaTime+"   "+heloControl.controlPitch+"   "+heloControl.controlRoll);



   /**
   control model, simple
   mouse rotates the helo body
   **/
   if(flightModelSimple) {

      helo.Rotate(Vector3(
         heloControl.controlPitch * -2,
         0.0,
         heloControl.controlRoll * -2
      ));
   }




   /**
   control model, advanced
   swashplate emulation
   raises/lowers swashplate points depending on input
   inputs are squared for finer control
   **/
   else {


      /**
      swashplate, cyclic input
      stick position indicates target pitch and max torque speed
      **/
      var controlPitch = heloControl.controlPitch;
      var controlRoll  = heloControl.controlRoll;


      // square
      controlPitch = controlPitch * Mathf.Abs(controlPitch);
      controlRoll  = controlRoll  * Mathf.Abs(controlRoll);


      // pitch
      swashplatePowerFront += swashplateCyclicMax * controlPitch;
      swashplatePowerBack  += swashplateCyclicMax * controlPitch * -1;


      // roll
      //swashplatePowerLeft  += swashplateCyclicMax * controlRoll;
      //swashplatePowerRight += swashplateCyclicMax * controlRoll * -1;




      /**
      stabilizer
      tuned to specs
      **/


      // target pitch/roll in degrees
      var pitchTarget = controlPitch * 100;
      var rollTarget  = controlRoll  * 100;


      // default stabilizer values, 0.01 per degree
      var stabilizerPitch : float = 0; // heloFlightData.pitch / -100;
      var stabilizerRoll  : float = 0; // heloFlightData.roll  / -100;


      var stabilizerTorqueMax : float = 90; // deg/s, max correction speed


      // current torque, deg/s
      var pitchTorque : float = heloFlightData.speedPitch;


      if(pitchTorque > stabilizerTorqueMax) {
         stabilizerPitch = controlPitch * -1;
         print(stabilizerPitch);
      }
      else if(
         (pitchTarget < 0 && heloFlightData.pitch < pitchTarget)
         ||
         (pitchTarget > 0 && heloFlightData.pitch > pitchTarget)
      ) {
         stabilizerPitch = controlPitch * -1;
         print("over");
      }




//print(pitchTarget);
//print(pitchDiff+"   "+pitchDiffStrength+"   "+pitchDiffDirection);



      /**
      stabilizer
      this works in 2 parts
      1. we limit pitch/roll to a maximum torque speed
      2. we make the cyclic input target a specific angle of attack (pitch/roll)
      then returns the swashplate to neutral position to maintain the angle
      0.01 unit of cyclic input is 1 degree
      affected range is -0.9/0.9 of the cyclic stick
      **




      // default stabilizer values, 0.01 per degree
      var stabilizerPitch : float = 0; // heloFlightData.pitch / -100;
      var stabilizerRoll  : float = 0; // heloFlightData.roll  / -100;


      // stabilizer effect range
      var stabilizerRangeMin : float = -0.9;
      var stabilizerRangeMax : float =  0.9;


      var stabilizerDir       : float = 0;
      var stabilizerDiff      : float = 0;
      var stabilizerTorque    : float = 0;
      var stabilizerTime      : float = 0;
      var stabilizerTorqueMax : float = 0;




      /**
      stabilize pitch
      **


      // difference between current pitch and target pitch in deg/s
      var pitchDiff          : float = heloControl.controlPitch * 100 - heloFlightData.pitch;
      var pitchDiffStrength  : float = pitchDiff != 0 ? Mathf.Abs(pitchDiff) : 0;
      var pitchDiffDirection : float = pitchDiff != 0 ? pitchDiff / pitchDiffStrength : 1;


      // current torque, deg/s
      var pitchTorque          : float = heloFlightData.speedPitch;
      var pitchTorqueStrength  : float = pitchTorque != 0 ? Mathf.Abs(pitchTorque) : 0;
      var pitchTorqueDirection : float = pitchTorque != 0 ? pitchTorque / pitchTorqueStrength : 1;


      // time to reach target pitch at current torque
      // negative means overshoot
      var pitchTimeTarget : float = pitchTorque != 0 ? pitchDiff / pitchTorque : 999;


      // maximum rotor torque in m/s
      var rotorTorqueMax : float = enginePower / bodyMass * swashplateCyclicMax;


      // maximum rotor torque in deg/s (rotor point of effect is 0.75m from center)
      rotorTorqueMax = rotorTorqueMax / 0.75 * Mathf.Rad2Deg;


      // how much time to kill current torque
      var pitchTimeKill : float = pitchTorqueStrength / rotorTorqueMax;


      // time left after accounting for torque kill
      var pitchTimeLeft : float = pitchTimeTarget - pitchTimeKill;




      // time left is under 100ms, time to kill torque
      if(pitchTimeLeft < 0.1) {

         // add torque correction
         stabilizerPitch += pitchTorqueStrength/rotorTorqueMax;

         // square correction to match cyclic input
         stabilizerPitch *= Mathf.Abs(stabilizerPitch);

         // cancel input
         stabilizerPitch += heloControl.controlPitch;

         // square correction to match cyclic input
         stabilizerPitch *= Mathf.Abs(stabilizerPitch);

         // invert
         stabilizerPitch *= pitchDiffDirection * -1;



print("------");
//print(pitchTorqueStrength+"/"+rotorTorqueMax);
print(heloControl.controlPitch);
print(stabilizerPitch);

         // how much pitch units to produce adequate counter torque
         //var zzz = pitchTorqueStrength / rotorTorqueMax * pitchTorqueDirection * -1;
      }

/**/








/*
      // NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
      // stuff is wrong like time

      // pitch direction, -1 is forward, 1 is backward
      stabilizerDir = heloControl.controlPitch != 0
         ? heloControl.controlPitch / Mathf.Abs(heloControl.controlPitch)
         : 0;

      // difference between desired AOA (from cyclic input) and actual AOA
      // positive difference means we have not yet reach target AOA
      // negative difference means we have gone too far
      stabilizerDiff = (heloControl.controlPitch - heloFlightData.pitch / 100) * stabilizerDir;

      // torque speed in current direction in deg/sec
      stabilizerTorque = heloFlightData.speedPitch * stabilizerDir * -1 * Mathf.Rad2Deg;
      //print("torque: "+stabilizerTorque);

      // time to reach target AOA at current torque
      stabilizerTime = stabilizerTorque != 0
         ? stabilizerDiff/stabilizerTorque
         : 0;
      //print("time to reach: "+stabilizerTime);


   how much counter torque can be produced
   enginePower / mass = torque m/s
   torque rotorRadius

   2 * PI * rad / s = 360deg/s

   2 PI R = circumference = 360deg

   2 PI R / torque (m/s) = time


   pow / mass * plateMax
      9.81








      // time left when accounted for torque kill time
      var timeMargin = stabilizerTime - timeToKill;
      //print("time margin: "+timeMargin);




      // we have more than enough time to stop
      if(timeMargin > 0) {

      }
      // not enough time to stop
      else {
         stabilizerPitch = stabilizerTorque / stabilizerTorqueMax * stabilizerDir;
print(stabilizerTorque+" / "+stabilizerTorqueMax);

      }

      produce counter torque such as torque can be killed off right in time to reach AOA
      we know the torque and how much time until AOA is reached
      we know how much power we can put into anti torque
      */









/*
      // AOA reached, kill the torque
      if(stabilizerDiff < 0) {
         stabilizerPitch = heloControl.controlPitch * -1;
      }
print("pitch: "+stabilizerPitch);
print("dir: "+stabilizerDir+"   diff: "+stabilizerDiff+"   torque: "+stabilizerTorque+"   time: "+stabilizerTime);
*/


      //if(heloControl.controlPitch >= stabilizerRangeMin && heloControl.controlPitch <= stabilizerRangeMax) {



         /*
            hmm, factor stuff relative to distance to target and static range
            lets say 30 deg max
            full force at zero, thats the default
            OR
            we use torque ETA to predict when to cancel torque
            our torque force is at 1.25m from center max force 1 * 1000 * 9.81
            thats cyclic factor + base force

            m/s / r  = rad/s

            0.5 * 1.25 = m/s
            0.625 m/s

            max angular accel
            enginePower * swashplateCyclicMax / mass / 1.25
            (9.81 * 1000) * 1 / 1000 / 1.25
            9.81 / 1.25 = 7.848 rad/s

            knowing our current ang spd and how much time before reaching target aoa
            we should produce a counter force that makes final speed fall within expected margins
         */

















/*
      // stabilize roll
      if(heloControl.controlRoll >= stabilizerRangeMin && heloControl.controlRoll <= stabilizerRangeMax) {

         // pitch direction, -1 is forward, 1 is backward
         stabilizerDir = heloControl.controlRoll != 0
            ? heloControl.controlRoll / Mathf.Abs(heloControl.controlRoll)
            : 0;

         // difference between desired AOA (from cyclic input) and actual AOA
         // positive difference means we have not yet reach target AOA
         // negative difference means we have gone too far
         stabilizerDiff = (heloControl.controlRoll - heloFlightData.roll / 100) * stabilizerDir;

         // torque speed in current direction in deg/sec
         stabilizerTorque = heloFlightData.speedRoll * stabilizerDir * -1 * Mathf.Rad2Deg;

         // time to reach target AOA at current torque
         stabilizerTime = stabilizerTorque != 0
            ? stabilizerDiff/stabilizerTorque
            : 0;


         tmp = (heloControl.controlRoll + stabilizerRoll) * stabilizerDir;
         if(tmp < 0) {
            //stabilizerRoll = heloControl.controlRoll * -1;
         }




//MEEEEEEEEEH
         // the more we go over the target AOA the stronger we push back
         if(stabilizerDiff < 0) {
            //stabilizerRoll += stabilizerTorque * -0.05 * stabilizerDir;
         }
      }
*/



/*
      // square correction to match cyclic input
      stabilizerPitch *= Mathf.Abs(stabilizerPitch);
      stabilizerRoll  *= Mathf.Abs(stabilizerRoll);
*/
/**
      // clamp stabilizer within limits (twice cyclic to allow max cancel)
      stabilizerPitch = Mathf.Clamp(
         stabilizerPitch,
         swashplateCyclicMax * -2,
         swashplateCyclicMax *  2
      );
      stabilizerRoll = Mathf.Clamp(
         stabilizerRoll,
         swashplateCyclicMax * -2,
         swashplateCyclicMax *  2
      );

/**/


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
   here we calculate how much lift we have from the engine
   **/
   var liftPower : float = enginePower;





   /**
   lift power: ground effect (cushion)
   + 0% at 1 rotor height
   +20% at 0 rotor height
      TODO: apply to all surfaces, not just ground, given sufficient area
   **/
   var cushionFactor : float = 1 - heloFlightData.altitude / 3;
   cushionFactor = Mathf.Clamp(cushionFactor, 0, 1);
   cushionFactor *= cushionFactor; // square
   liftPower *= 1 + cushionFactor * 0.20;




   /**
   lift power: effective translational lift
   +10% lift at 20m/s and beyond (horizontal speed)
   **/
   var etlPowerFactor : float = heloFlightData.speedHorizontal / 20;
   etlPowerFactor = Mathf.Clamp(etlPowerFactor, 0, 1);
   etlPowerFactor *= etlPowerFactor; // square
   liftPower *= 1 + etlPowerFactor * 0.1;




   /**
   apply lift power and swashplate action
   **/
   helo.rigidbody.AddForceAtPosition(
      swashplateFront.up * liftPower/4 * swashplatePowerFront,
      swashplateFront.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateBack.up * liftPower/4 * swashplatePowerBack,
      swashplateBack.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateLeft.up * liftPower/4 * swashplatePowerLeft,
      swashplateLeft.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateRight.up * liftPower/4 * swashplatePowerRight,
      swashplateRight.position,
      ForceMode.Force
   );




/*
   print(""
      +" F: "+swashplatePowerFront
      +" B: "+swashplatePowerBack
      +" L: "+swashplatePowerLeft
      +" R: "+swashplatePowerRight
   );
*/
}