  END IF;

  -- Create the conversation row
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conv_id;

  -- Insert both participants in one statement (bypasses RLS)
  INSERT INTO public.conversation_participants
    (conversation_id, user_id, is_public_list)
  VALUES
    (v_conv_id, auth.uid(), false),
    (v_conv_id, p_other_user_id, p_other_is_public_list)
  ON CONFLICT DO NOTHING;

  -- Return the conversation ID (even if participants were already added)
  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, boolean) TO authenticated;
