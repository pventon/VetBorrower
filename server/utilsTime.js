/**
 * Copyright (c) 2025 Ventec SW LLC.
 * All rights reserved.
 * 
 * This software is the intellectual property of Ventec SW LLC. Permission is
 * hereby denied for any use, copying, modification, distribution, or
 * transmission of this software and its design paradigm, in whole or in
 * part, without the prior written permission of Ventec SW LLC.
 *
 * No part of this source code may be copied, reproduced, distributed,
 * or transmitted in any form or by any means, electronic or mechanical,
 * without the prior written permission of the copyright holder, nor 
 * shall it be used for any purpose other than in connection with an 
 * agreement or proposed agreement with Ventec SW LLC.
 */

/**
 * Utility function to get the current date and time.
 * Get's today's date in local time as MM/DD/YYYY, HH:MM:SS AM/PM
 *
 * This function returns a string representing the current local date and time.
 *
 * @returns {string} - The current local date and time.
 */
export function GetLocalDateTime() {
  // Converts to a string representing the local time
  return new Date().toLocaleString(); 
}